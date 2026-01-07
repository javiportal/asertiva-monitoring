"""
Content Extractor for WatchGuard.

Extracts clean text from HTML content using:
1. Custom CSS selector (if configured)
2. Readability algorithm (fallback)
"""

from typing import Optional

import structlog
from bs4 import BeautifulSoup
from readability import Document

from .config import SiteConfig

log = structlog.get_logger()


def extract_text(html: str, site: SiteConfig) -> str:
    """
    Extract meaningful text content from HTML.
    
    Args:
        html: Raw HTML content.
        site: Site configuration with optional content_selector.
        
    Returns:
        Extracted text content.
    """
    if not html or not html.strip():
        return ""
    
    try:
        # Method 1: Use custom CSS selector if configured
        if site.content_selector:
            text = _extract_with_selector(html, site)
            if text:
                log.debug("extracted_with_selector", 
                         selector=site.content_selector, 
                         chars=len(text))
                return text
            log.warning("selector_returned_empty", 
                       selector=site.content_selector,
                       falling_back_to="readability")
        
        # Method 2: Use readability algorithm
        text = _extract_with_readability(html, site)
        log.debug("extracted_with_readability", chars=len(text))
        return text
        
    except Exception as e:
        log.error("extraction_failed", error=str(e), url=site.url)
        # Last resort: strip all tags
        return _extract_basic(html)


def _extract_with_selector(html: str, site: SiteConfig) -> Optional[str]:
    """Extract text using configured CSS selector."""
    soup = BeautifulSoup(html, "lxml")
    
    # Remove excluded elements first
    for exclude_selector in site.exclude_selectors:
        for element in soup.select(exclude_selector):
            element.decompose()
    
    # Find main content
    content = soup.select_one(site.content_selector)
    if not content:
        return None
    
    # Get text with newlines between block elements
    return content.get_text(separator="\n", strip=True)


def _extract_with_readability(html: str, site: SiteConfig) -> str:
    """Extract text using readability algorithm."""
    try:
        doc = Document(html)
        summary_html = doc.summary()
        
        soup = BeautifulSoup(summary_html, "lxml")
        
        # Remove excluded elements
        for exclude_selector in site.exclude_selectors:
            for element in soup.select(exclude_selector):
                element.decompose()
        
        return soup.get_text(separator="\n", strip=True)
        
    except Exception as e:
        log.warning("readability_failed", error=str(e))
        return _extract_basic(html)


def _extract_basic(html: str) -> str:
    """Basic extraction - just strip tags."""
    soup = BeautifulSoup(html, "lxml")
    
    # Remove script and style elements
    for element in soup(["script", "style", "nav", "footer", "header"]):
        element.decompose()
    
    return soup.get_text(separator="\n", strip=True)


def get_page_title(html: str) -> Optional[str]:
    """Extract page title from HTML."""
    try:
        soup = BeautifulSoup(html, "lxml")
        
        # Try <title> tag first
        if soup.title and soup.title.string:
            return soup.title.string.strip()
        
        # Try <h1> as fallback
        h1 = soup.find("h1")
        if h1:
            return h1.get_text(strip=True)
        
        return None
        
    except Exception:
        return None