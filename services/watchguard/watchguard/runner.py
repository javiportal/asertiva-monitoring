"""
WatchGuard Runner - Main orchestration logic.

Coordinates the full monitoring pipeline:
1. Load site configs
2. Fetch content
3. Extract and normalize
4. Compare with previous snapshot
5. If changed, generate diff and post to API
"""

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional

import structlog

from .config import Config, SiteConfig, get_config, load_config
from .differ import compute_diff, format_diff_summary, is_meaningful_change
from .extractor import extract_text, get_page_title
from .fetcher import FetchResult, fetch
from .ingest_client import IngestResult, build_payload, get_ingest_client
from .normalizer import compute_hash, generate_source_id, normalize
from .storage import SnapshotComparison, get_storage

log = structlog.get_logger()


@dataclass
class RunResult:
    """Result of running monitor for a single site."""
    url: str
    name: str
    success: bool
    fetch_success: bool = False
    has_previous: bool = False
    is_changed: bool = False
    is_meaningful: bool = False
    was_ingested: bool = False
    was_duplicate: bool = False
    change_id: Optional[int] = None
    error: Optional[str] = None
    diff_summary: Optional[str] = None


def run_single(site: SiteConfig) -> RunResult:
    """
    Run the monitoring pipeline for a single site.
    
    Args:
        site: Site configuration.
        
    Returns:
        RunResult with status and details.
    """
    log.info("running_monitor", url=site.url, name=site.name)
    
    result = RunResult(url=site.url, name=site.name, success=False)
    
    # Step 1: Fetch content
    fetch_result = fetch(site)
    
    if not fetch_result.success:
        result.error = fetch_result.error
        log.error("fetch_failed", url=site.url, error=fetch_result.error)
        return result
    
    result.fetch_success = True
    
    # Step 2: Extract text
    raw_text = extract_text(fetch_result.content, site)
    
    if not raw_text or len(raw_text.strip()) < 50:
        result.error = "Extracted text too short (< 50 chars)"
        log.warning("extraction_too_short", url=site.url, chars=len(raw_text) if raw_text else 0)
        return result
    
    # Get title
    title = get_page_title(fetch_result.content) or site.name
    
    # Step 3: Normalize and hash
    normalized = normalize(raw_text, site)
    content_hash = compute_hash(normalized)
    
    # Step 4: Compare with previous snapshot
    storage = get_storage()
    comparison = storage.compare_and_save(
        url=site.url,
        content_hash=content_hash,
        normalized_text=normalized,
        raw_text=raw_text,
        title=title,
    )
    
    result.has_previous = comparison.has_previous
    result.is_changed = comparison.is_changed
    
    if not comparison.is_changed:
        result.success = True
        log.info("no_change_detected", url=site.url)
        return result
    
    # Step 5: Compute diff (if we have previous)
    if comparison.previous:
        diff_result = compute_diff(
            comparison.previous.raw_text,
            comparison.current.raw_text,
        )
        
        result.diff_summary = format_diff_summary(diff_result)
        
        # Check if change is meaningful
        result.is_meaningful = is_meaningful_change(diff_result)
        
        if not result.is_meaningful:
            result.success = True
            log.info("change_not_meaningful", 
                    url=site.url, 
                    summary=result.diff_summary)
            return result
        
        diff_text = diff_result.diff_text
        previous_text = comparison.previous.raw_text
    else:
        # First fetch - no previous to compare
        diff_text = f"+++ Initial fetch\n{raw_text[:1000]}..."
        previous_text = ""
        result.is_meaningful = True
    
    # Step 6: Post to ingest API
    source_id = generate_source_id(site.url)
    
    payload = build_payload(
        site=site,
        source_id=source_id,
        title=title,
        previous_text=previous_text,
        current_text=raw_text,
        diff_text=diff_text,
        content_hash=content_hash,
        fetch_mode=fetch_result.fetch_mode,
        fetched_at=datetime.fromisoformat(fetch_result.fetched_at) if fetch_result.fetched_at else datetime.now(timezone.utc),
    )
    
    client = get_ingest_client()
    ingest_result = client.post_change(payload)
    
    if ingest_result.success:
        result.success = True
        result.was_ingested = ingest_result.ok and not ingest_result.duplicate
        result.was_duplicate = ingest_result.duplicate
        result.change_id = ingest_result.change_id
        
        if result.was_duplicate:
            log.info("change_was_duplicate", url=site.url)
        else:
            log.info("change_ingested_successfully", 
                    url=site.url, 
                    change_id=result.change_id,
                    summary=result.diff_summary)
    else:
        result.error = ingest_result.error
        log.error("ingest_failed", url=site.url, error=ingest_result.error)
    
    return result


def run_all(config: Optional[Config] = None) -> list[RunResult]:
    """
    Run monitoring for all configured sites.
    
    Args:
        config: Configuration to use. Defaults to global config.
        
    Returns:
        List of RunResults for each site.
    """
    if config is None:
        config = get_config()
    
    if not config.sites:
        log.warning("no_sites_configured")
        return []
    
    log.info("starting_run", site_count=len(config.sites))
    
    results = []
    for site in config.sites:
        try:
            result = run_single(site)
            results.append(result)
        except Exception as e:
            log.exception("unexpected_error", url=site.url)
            results.append(RunResult(
                url=site.url,
                name=site.name,
                success=False,
                error=f"Unexpected error: {e}",
            ))
    
    # Summary
    successful = sum(1 for r in results if r.success)
    changed = sum(1 for r in results if r.is_changed and r.is_meaningful)
    ingested = sum(1 for r in results if r.was_ingested)
    
    log.info("run_complete",
            total=len(results),
            successful=successful,
            changes_detected=changed,
            ingested=ingested)
    
    return results


def run_url(url: str) -> RunResult:
    """
    Run monitoring for a single URL (for testing).
    
    Creates a minimal site config and runs the pipeline.
    
    Args:
        url: URL to monitor.
        
    Returns:
        RunResult with status.
    """
    from urllib.parse import urlparse
    
    parsed = urlparse(url)
    
    # Create minimal config
    site = SiteConfig(
        url=url,
        name=parsed.netloc,
        fetch_mode="http",
        source_name=parsed.netloc,
        source_country="México",
    )
    
    return run_single(site)