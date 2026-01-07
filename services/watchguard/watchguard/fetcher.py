"""
HTTP Fetcher for WatchGuard.

Downloads web pages using httpx. Future versions will add:
- Playwright for JS-heavy sites
- PDF extraction
"""

import time
from dataclasses import dataclass
from typing import Optional
from urllib.parse import urlparse

import httpx
import structlog
from tenacity import retry, stop_after_attempt, wait_exponential

from .config import SiteConfig, get_config

log = structlog.get_logger()


@dataclass
class FetchResult:
    """Result of fetching a URL."""
    url: str
    success: bool
    content: Optional[str] = None
    content_type: Optional[str] = None
    status_code: Optional[int] = None
    error: Optional[str] = None
    fetch_mode: str = "http"
    fetched_at: Optional[str] = None


class RateLimiter:
    """Simple per-domain rate limiter."""
    
    def __init__(self):
        self._last_request: dict[str, float] = {}
    
    def wait_for(self, url: str, delay_seconds: int = 5):
        """Wait if necessary to respect rate limits for this domain."""
        domain = urlparse(url).netloc
        now = time.time()
        last = self._last_request.get(domain, 0)
        elapsed = now - last
        
        if elapsed < delay_seconds:
            wait_time = delay_seconds - elapsed
            log.debug("rate_limiting", domain=domain, wait_seconds=round(wait_time, 1))
            time.sleep(wait_time)
        
        self._last_request[domain] = time.time()


# Global rate limiter instance
_rate_limiter = RateLimiter()


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=30),
)
def _fetch_http(url: str, user_agent: str, timeout: int = 30) -> httpx.Response:
    """Fetch URL with retries."""
    headers = {
        "User-Agent": user_agent,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "es-MX,es;q=0.9,en;q=0.8",
    }
    
    with httpx.Client(follow_redirects=True, timeout=timeout) as client:
        return client.get(url, headers=headers)


def fetch(site: SiteConfig) -> FetchResult:
    """
    Fetch content from a site.
    
    Currently supports HTTP only. Playwright and PDF coming in future phases.
    
    Args:
        site: Site configuration with URL and settings.
        
    Returns:
        FetchResult with content or error information.
    """
    from datetime import datetime, timezone
    
    config = get_config()
    url = site.url
    
    log.info("fetching", url=url, mode=site.fetch_mode, name=site.name)
    
    # Respect rate limits
    _rate_limiter.wait_for(url, site.rate_limit_seconds)
    
    # Route to appropriate fetcher based on mode
    if site.fetch_mode == "http":
        return _fetch_http_mode(url, config.settings.user_agent)
    elif site.fetch_mode == "browser":
        # TODO: Phase 2 - Playwright
        log.warning("browser_mode_not_implemented", url=url)
        return FetchResult(
            url=url,
            success=False,
            error="Browser mode not yet implemented. Use fetch_mode: http",
            fetch_mode="browser",
        )
    elif site.fetch_mode == "pdf":
        # TODO: Phase 3 - PDF extraction
        log.warning("pdf_mode_not_implemented", url=url)
        return FetchResult(
            url=url,
            success=False,
            error="PDF mode not yet implemented. Use fetch_mode: http",
            fetch_mode="pdf",
        )
    else:
        return FetchResult(
            url=url,
            success=False,
            error=f"Unknown fetch_mode: {site.fetch_mode}",
            fetch_mode=site.fetch_mode,
        )


def _fetch_http_mode(url: str, user_agent: str) -> FetchResult:
    """Fetch via simple HTTP request."""
    from datetime import datetime, timezone
    
    try:
        response = _fetch_http(url, user_agent)
        
        content_type = response.headers.get("content-type", "").lower()
        
        # Check if it's actually a PDF (some servers don't use .pdf extension)
        if "application/pdf" in content_type:
            return FetchResult(
                url=url,
                success=False,
                error="URL returned PDF content. Use fetch_mode: pdf",
                status_code=response.status_code,
                content_type=content_type,
                fetch_mode="http",
            )
        
        return FetchResult(
            url=url,
            success=True,
            content=response.text,
            content_type=content_type,
            status_code=response.status_code,
            fetch_mode="http",
            fetched_at=datetime.now(timezone.utc).isoformat(),
        )
        
    except httpx.TimeoutException as e:
        log.error("fetch_timeout", url=url, error=str(e))
        return FetchResult(
            url=url,
            success=False,
            error=f"Timeout: {e}",
            fetch_mode="http",
        )
    except httpx.HTTPError as e:
        log.error("fetch_http_error", url=url, error=str(e))
        return FetchResult(
            url=url,
            success=False,
            error=f"HTTP error: {e}",
            fetch_mode="http",
        )
    except Exception as e:
        log.error("fetch_unexpected_error", url=url, error=str(e))
        return FetchResult(
            url=url,
            success=False,
            error=f"Unexpected error: {e}",
            fetch_mode="http",
        )