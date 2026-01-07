"""
Text Normalizer for WatchGuard.

Normalizes extracted text to:
1. Remove noise (dates, visit counters, etc.)
2. Standardize whitespace
3. Generate content hash for comparison
"""

import hashlib
import re
import unicodedata
from typing import Optional

import structlog

from .config import SiteConfig

log = structlog.get_logger()

# Common noise patterns to remove
DEFAULT_NOISE_PATTERNS = [
    # Dates in various formats
    r'\d{1,2}/\d{1,2}/\d{2,4}',
    r'\d{1,2}-\d{1,2}-\d{2,4}',
    r'\d{1,2}\s+de\s+\w+\s+de\s+\d{4}',  # Spanish dates
    
    # Timestamps
    r'\d{1,2}:\d{2}(:\d{2})?\s*(am|pm|AM|PM)?',
    
    # Visit/view counters
    r'[Vv]isitas?:?\s*\d+',
    r'[Vv]istas?:?\s*\d+',
    r'[Vv]iews?:?\s*\d+',
    
    # Update timestamps
    r'[Úú]ltima\s+(actualización|modificación):?\s*.*',
    r'[Ll]ast\s+(updated?|modified):?\s*.*',
    
    # Copyright notices (year changes yearly)
    r'©\s*\d{4}.*',
    r'[Cc]opyright\s*\d{4}.*',
    
    # Session IDs and tracking params (in URLs that might appear in text)
    r'[?&](sid|session|token|utm_\w+)=[^&\s]+',
]


def normalize(text: str, site: Optional[SiteConfig] = None) -> str:
    """
    Normalize text for consistent comparison.
    
    Args:
        text: Raw extracted text.
        site: Optional site config with custom ignore patterns.
        
    Returns:
        Normalized text suitable for hashing.
    """
    if not text:
        return ""
    
    # 1. Unicode normalization (NFKC)
    text = unicodedata.normalize("NFKC", text)
    
    # 2. Apply noise patterns
    patterns = DEFAULT_NOISE_PATTERNS.copy()
    if site and site.ignore_patterns:
        patterns.extend(site.ignore_patterns)
    
    for pattern in patterns:
        try:
            text = re.sub(pattern, " ", text, flags=re.IGNORECASE | re.MULTILINE)
        except re.error as e:
            log.warning("invalid_pattern", pattern=pattern, error=str(e))
    
    # 3. Normalize whitespace
    # Replace multiple spaces/newlines with single space
    text = re.sub(r'\s+', ' ', text)
    
    # 4. Strip leading/trailing whitespace
    text = text.strip()
    
    # 5. Lowercase for comparison
    text = text.lower()
    
    return text


def compute_hash(text: str) -> str:
    """
    Compute SHA-256 hash of normalized text.
    
    Args:
        text: Normalized text.
        
    Returns:
        Hex-encoded SHA-256 hash.
    """
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def generate_source_id(url: str, timestamp: Optional[int] = None) -> str:
    """
    Generate a unique source ID for WatchGuard records.
    
    Format: watchguard:<url_hash>:<timestamp>
    
    Args:
        url: The monitored URL.
        timestamp: Unix timestamp (defaults to current time).
        
    Returns:
        Source ID string compatible with wachet_id field.
    """
    import time
    
    url_hash = hashlib.sha256(url.encode("utf-8")).hexdigest()[:12]
    ts = timestamp or int(time.time())
    
    return f"watchguard:{url_hash}:{ts}"


def texts_are_similar(text1: str, text2: str, threshold: float = 0.98) -> bool:
    """
    Check if two texts are similar enough to be considered unchanged.
    
    Uses simple character-level comparison. For more sophisticated
    comparison, consider difflib.SequenceMatcher.
    
    Args:
        text1: First text (normalized).
        text2: Second text (normalized).
        threshold: Similarity threshold (0-1).
        
    Returns:
        True if texts are similar enough to skip.
    """
    if not text1 and not text2:
        return True
    if not text1 or not text2:
        return False
    
    # Quick check: if hashes match, definitely same
    if compute_hash(text1) == compute_hash(text2):
        return True
    
    # Length-based quick rejection
    len_ratio = min(len(text1), len(text2)) / max(len(text1), len(text2))
    if len_ratio < threshold:
        return False
    
    # Character-level similarity
    from difflib import SequenceMatcher
    ratio = SequenceMatcher(None, text1, text2).ratio()
    
    return ratio >= threshold