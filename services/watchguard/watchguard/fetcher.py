"""
HTTP, Browser, and PDF Fetcher for WatchGuard.
"""

import io
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
    url: str
    success: bool
    content: Optional[str] = None
    content_type: Optional[str] = None
    status_code: Optional[int] = None
    error: Optional[str] = None
    fetch_mode: str = "http"
    fetched_at: Optional[str] = None


class RateLimiter:
    def __init__(self):
        self._last_request: dict[str, float] = {}
    
    def wait_for(self, url: str, delay_seconds: int = 5):
        domain = urlparse(url).netloc
        now = time.time()
        last = self._last_request.get(domain, 0)
        elapsed = now - last
        
        if elapsed < delay_seconds:
            wait_time = delay_seconds - elapsed
            log.debug("rate_limiting", domain=domain, wait_seconds=round(wait_time, 1))
            time.sleep(wait_time)
        
        self._last_request[domain] = time.time()


_rate_limiter = RateLimiter()


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=30),
)
def _fetch_http(url: str, user_agent: str, timeout: int = 30) -> httpx.Response:
    headers = {
        "User-Agent": user_agent,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "es-MX,es;q=0.9,en;q=0.8",
    }
    
    with httpx.Client(follow_redirects=True, timeout=timeout) as client:
        return client.get(url, headers=headers)


# Real browser headers for httpx fallback (mimics Chrome on macOS)
BROWSER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "Accept-Language": "es-MX,es;q=0.9,en-US;q=0.8,en;q=0.7",
    "Accept-Encoding": "gzip, deflate, br",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
    "Sec-Ch-Ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"macOS"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
}


def _fetch_pdf_bytes_playwright(url: str, timeout: int = 60000) -> bytes:
    """
    Fetch PDF bytes using Playwright browser.
    This bypasses bot detection that blocks simple HTTP requests.

    Handles both:
    1. PDFs that render inline (captured via response interception)
    2. PDFs that trigger downloads (captured via download handler)
    """
    import tempfile
    import os as _os

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        raise ImportError("Playwright not installed. Run: pip install playwright && playwright install chromium")

    pdf_bytes: bytes = b""
    download_path: str = ""

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            locale="es-MX",
            accept_downloads=True,
        )
        page = context.new_page()

        # Capture the response body when navigating to PDF URL
        def handle_response(response):
            nonlocal pdf_bytes
            # Only capture if we haven't already got bytes
            if pdf_bytes:
                return
            try:
                resp_url = response.url
                content_type = response.headers.get("content-type", "")
                # Check if this is the PDF response (matching URL or redirect chain)
                if "application/pdf" in content_type or (
                    resp_url.lower().endswith(".pdf") and response.status == 200
                ):
                    pdf_bytes = response.body()
                    log.debug("captured_pdf_from_response", url=resp_url, size=len(pdf_bytes))
            except Exception as e:
                log.debug("response_body_capture_failed", error=str(e))

        # Handle downloads (for PDFs that trigger file download instead of inline display)
        def handle_download(download):
            nonlocal download_path
            try:
                # Save to temp file
                with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
                    download_path = tmp.name
                download.save_as(download_path)
                log.debug("pdf_download_saved", path=download_path)
            except Exception as e:
                log.debug("download_save_failed", error=str(e))

        page.on("response", handle_response)
        page.on("download", handle_download)

        try:
            # Navigate to the PDF URL
            # This might either render inline or trigger a download
            response = page.goto(url, timeout=timeout, wait_until="commit")

            # Wait a bit for download to complete if triggered
            page.wait_for_timeout(3000)

            # If we didn't capture bytes from response, try getting from response directly
            if not pdf_bytes and response:
                try:
                    content_type = response.headers.get("content-type", "")
                    if "application/pdf" in content_type:
                        pdf_bytes = response.body()
                except Exception:
                    pass

        except Exception as e:
            # "Download is starting" error is expected for download-triggered PDFs
            if "Download is starting" not in str(e):
                log.debug("playwright_pdf_navigation_error", url=url, error=str(e))
            # Wait for download to complete
            page.wait_for_timeout(3000)
        finally:
            browser.close()

        # If we got bytes from download file, read them
        if not pdf_bytes and download_path and _os.path.exists(download_path):
            try:
                with open(download_path, "rb") as f:
                    pdf_bytes = f.read()
                log.debug("read_pdf_from_download", path=download_path, size=len(pdf_bytes))
            finally:
                # Clean up temp file
                try:
                    _os.unlink(download_path)
                except Exception:
                    pass

    if not pdf_bytes:
        raise Exception("Failed to capture PDF bytes via Playwright")

    return pdf_bytes


@retry(
    stop=stop_after_attempt(2),
    wait=wait_exponential(multiplier=1, min=2, max=10),
)
def _fetch_pdf_bytes_httpx(url: str, timeout: int = 60) -> bytes:
    """
    Fallback: Fetch PDF bytes using httpx with real browser headers.
    """
    with httpx.Client(follow_redirects=True, timeout=timeout) as client:
        response = client.get(url, headers=BROWSER_HEADERS)
        response.raise_for_status()
        return response.content


def _fetch_pdf_bytes(url: str, user_agent: str, timeout: int = 60) -> bytes:
    """
    Fetch PDF bytes, trying Playwright first (better for bot-protected sites),
    then falling back to httpx with real browser headers.
    """
    # Try Playwright first (bypasses most bot detection)
    try:
        log.debug("trying_playwright_pdf_fetch", url=url)
        pdf_bytes = _fetch_pdf_bytes_playwright(url, timeout=timeout * 1000)
        log.info("pdf_fetched_via_playwright", url=url, size_bytes=len(pdf_bytes))
        return pdf_bytes
    except ImportError as e:
        log.warning("playwright_not_available", error=str(e))
    except Exception as e:
        log.warning("playwright_pdf_fetch_failed", url=url, error=str(e))

    # Fallback to httpx with real browser headers
    log.debug("falling_back_to_httpx_pdf_fetch", url=url)
    try:
        pdf_bytes = _fetch_pdf_bytes_httpx(url, timeout=timeout)
        log.info("pdf_fetched_via_httpx", url=url, size_bytes=len(pdf_bytes))
        return pdf_bytes
    except httpx.HTTPStatusError as e:
        log.error("httpx_pdf_fetch_failed", url=url, status_code=e.response.status_code, error=str(e))
        raise
    except Exception as e:
        log.error("httpx_pdf_fetch_error", url=url, error=str(e))
        raise


def _fetch_browser(url: str, wait_selector: Optional[str] = None, timeout: int = 30000) -> FetchResult:
    """Fetch using Playwright browser."""
    from datetime import datetime, timezone
    
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return FetchResult(
            url=url,
            success=False,
            error="Playwright not installed. Run: pip install playwright && playwright install chromium",
            fetch_mode="browser",
        )
    
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                locale="es-MX",
            )
            page = context.new_page()
            
            page.goto(url, timeout=timeout, wait_until="networkidle")
            
            if wait_selector:
                page.wait_for_selector(wait_selector, timeout=10000)
            
            content = page.content()
            
            browser.close()
            
            return FetchResult(
                url=url,
                success=True,
                content=content,
                content_type="text/html",
                status_code=200,
                fetch_mode="browser",
                fetched_at=datetime.now(timezone.utc).isoformat(),
            )
            
    except Exception as e:
        log.error("browser_fetch_error", url=url, error=str(e))
        return FetchResult(
            url=url,
            success=False,
            error=f"Browser error: {e}",
            fetch_mode="browser",
        )


def _fetch_pdf(url: str, user_agent: str) -> FetchResult:
    """Fetch and extract text from PDF."""
    from datetime import datetime, timezone
    
    try:
        import pdfplumber
    except ImportError:
        return FetchResult(
            url=url,
            success=False,
            error="pdfplumber not installed. Run: pip install pdfplumber",
            fetch_mode="pdf",
        )
    
    try:
        log.debug("downloading_pdf", url=url)
        pdf_bytes = _fetch_pdf_bytes(url, user_agent)
        
        log.debug("extracting_pdf_text", url=url, size_bytes=len(pdf_bytes))
        
        text_parts = []
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            total_pages = len(pdf.pages)
            log.debug("pdf_pages", url=url, pages=total_pages)
            
            for i, page in enumerate(pdf.pages):
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)
        
        full_text = "\n\n".join(text_parts)
        
        if not full_text.strip():
            return FetchResult(
                url=url,
                success=False,
                error="PDF has no extractable text (might be scanned/image-based)",
                fetch_mode="pdf",
            )
        
        log.info("pdf_extracted", url=url, pages=total_pages, chars=len(full_text))
        
        return FetchResult(
            url=url,
            success=True,
            content=full_text,
            content_type="application/pdf",
            status_code=200,
            fetch_mode="pdf",
            fetched_at=datetime.now(timezone.utc).isoformat(),
        )
        
    except httpx.HTTPError as e:
        log.error("pdf_download_error", url=url, error=str(e))
        return FetchResult(
            url=url,
            success=False,
            error=f"PDF download error: {e}",
            fetch_mode="pdf",
        )
    except Exception as e:
        log.error("pdf_extract_error", url=url, error=str(e))
        return FetchResult(
            url=url,
            success=False,
            error=f"PDF extraction error: {e}",
            fetch_mode="pdf",
        )


def fetch(site: SiteConfig) -> FetchResult:
    from datetime import datetime, timezone
    
    config = get_config()
    url = site.url
    
    log.info("fetching", url=url, mode=site.fetch_mode, name=site.name)
    
    _rate_limiter.wait_for(url, site.rate_limit_seconds)
    
    if site.fetch_mode == "http":
        return _fetch_http_mode(url, config.settings.user_agent)
    elif site.fetch_mode == "browser":
        return _fetch_browser(url, getattr(site, 'wait_selector', None))
    elif site.fetch_mode == "pdf":
        return _fetch_pdf(url, config.settings.user_agent)
    else:
        return FetchResult(
            url=url,
            success=False,
            error=f"Unknown fetch_mode: {site.fetch_mode}",
            fetch_mode=site.fetch_mode,
        )


def _fetch_http_mode(url: str, user_agent: str) -> FetchResult:
    from datetime import datetime, timezone
    
    try:
        response = _fetch_http(url, user_agent)
        
        content_type = response.headers.get("content-type", "").lower()
        
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
