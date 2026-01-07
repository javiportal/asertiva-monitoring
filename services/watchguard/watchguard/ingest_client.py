"""
Ingest API Client for WatchGuard.

Posts detected changes to the RiskMonitor API.
"""

from dataclasses import dataclass
from datetime import datetime
from typing import Optional

import httpx
import structlog
from tenacity import retry, stop_after_attempt, wait_exponential

from .config import SiteConfig, get_config

log = structlog.get_logger()


@dataclass
class IngestPayload:
    """Payload for the /ingest/changes endpoint."""
    source_id: str
    url: str
    title: str
    previous_text: str
    current_text: str
    diff_text: str
    content_hash: str
    fetch_mode: str
    fetched_at: str
    source_name: Optional[str] = None
    source_country: Optional[str] = None
    
    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "source_id": self.source_id,
            "url": self.url,
            "title": self.title,
            "previous_text": self.previous_text,
            "current_text": self.current_text,
            "diff_text": self.diff_text,
            "content_hash": self.content_hash,
            "fetch_mode": self.fetch_mode,
            "fetched_at": self.fetched_at,
            "source_name": self.source_name,
            "source_country": self.source_country,
        }


@dataclass
class IngestResult:
    """Result from the ingest API."""
    success: bool
    ok: bool = False
    duplicate: bool = False
    change_id: Optional[int] = None
    error: Optional[str] = None


class IngestClient:
    """Client for posting changes to RiskMonitor API."""
    
    def __init__(self, api_url: Optional[str] = None):
        """
        Initialize client.
        
        Args:
            api_url: Base URL of RiskMonitor API. Defaults to config setting.
        """
        if api_url is None:
            config = get_config()
            api_url = config.settings.api_url
        
        self.api_url = api_url.rstrip("/")
        self.endpoint = f"{self.api_url}/ingest/changes"
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=30),
    )
    def _post(self, payload: dict) -> httpx.Response:
        """POST with retries."""
        with httpx.Client(timeout=30) as client:
            return client.post(
                self.endpoint,
                json=payload,
                headers={"Content-Type": "application/json"},
            )
    
    def post_change(self, payload: IngestPayload) -> IngestResult:
        """
        Post a change to the ingest API.
        
        Args:
            payload: Change data to post.
            
        Returns:
            IngestResult with success status and any returned data.
        """
        log.info("posting_change", 
                url=payload.url, 
                endpoint=self.endpoint)
        
        try:
            response = self._post(payload.to_dict())
            
            if response.status_code == 200:
                data = response.json()
                result = IngestResult(
                    success=True,
                    ok=data.get("ok", False),
                    duplicate=data.get("duplicate", False),
                    change_id=data.get("change_id"),
                )
                
                if result.duplicate:
                    log.info("change_was_duplicate", url=payload.url)
                else:
                    log.info("change_ingested", 
                            url=payload.url, 
                            change_id=result.change_id)
                
                return result
            else:
                error_msg = f"HTTP {response.status_code}: {response.text}"
                log.error("ingest_failed", 
                         url=payload.url, 
                         status=response.status_code,
                         error=response.text)
                return IngestResult(success=False, error=error_msg)
                
        except httpx.TimeoutException as e:
            log.error("ingest_timeout", url=payload.url, error=str(e))
            return IngestResult(success=False, error=f"Timeout: {e}")
            
        except httpx.HTTPError as e:
            log.error("ingest_http_error", url=payload.url, error=str(e))
            return IngestResult(success=False, error=f"HTTP error: {e}")
            
        except Exception as e:
            log.error("ingest_unexpected_error", url=payload.url, error=str(e))
            return IngestResult(success=False, error=f"Unexpected error: {e}")


def build_payload(
    site: SiteConfig,
    source_id: str,
    title: str,
    previous_text: str,
    current_text: str,
    diff_text: str,
    content_hash: str,
    fetch_mode: str,
    fetched_at: datetime,
) -> IngestPayload:
    """
    Build an IngestPayload from components.
    
    Args:
        site: Site configuration.
        source_id: Generated source ID (watchguard:xxx:timestamp).
        title: Page title.
        previous_text: Previous version text.
        current_text: Current version text.
        diff_text: Unified diff.
        content_hash: Hash of normalized current text.
        fetch_mode: How content was fetched (http/browser/pdf).
        fetched_at: When content was fetched.
        
    Returns:
        IngestPayload ready to post.
    """
    return IngestPayload(
        source_id=source_id,
        url=site.url,
        title=title or site.name,
        previous_text=previous_text,
        current_text=current_text,
        diff_text=diff_text,
        content_hash=content_hash,
        fetch_mode=fetch_mode,
        fetched_at=fetched_at.isoformat() if isinstance(fetched_at, datetime) else fetched_at,
        source_name=site.source_name,
        source_country=site.source_country,
    )


# Singleton client instance
_client: Optional[IngestClient] = None


def get_ingest_client() -> IngestClient:
    """Get the global ingest client instance."""
    global _client
    if _client is None:
        _client = IngestClient()
    return _client