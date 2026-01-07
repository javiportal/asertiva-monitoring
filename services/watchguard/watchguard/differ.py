"""
Diff Generator for WatchGuard.

Generates unified diffs between previous and current content.
"""

import difflib
from dataclasses import dataclass
from typing import Optional

import structlog

log = structlog.get_logger()


@dataclass
class DiffResult:
    """Result of comparing two text versions."""
    has_changes: bool
    diff_text: str
    similarity_ratio: float
    added_lines: int
    removed_lines: int
    added_chars: int


# Thresholds for determining meaningful changes
MIN_CHANGE_RATIO = 0.01      # At least 1% different
MAX_CHANGE_RATIO = 0.95      # But not completely different (likely error)
MIN_ADDED_CHARS = 20         # At least 20 chars of actual new content


def compute_diff(previous: str, current: str) -> DiffResult:
    """
    Compute unified diff between two text versions.
    
    Args:
        previous: Previous version text.
        current: Current version text.
        
    Returns:
        DiffResult with diff text and statistics.
    """
    if not previous and not current:
        return DiffResult(
            has_changes=False,
            diff_text="",
            similarity_ratio=1.0,
            added_lines=0,
            removed_lines=0,
            added_chars=0,
        )
    
    # Handle edge cases
    if not previous:
        return DiffResult(
            has_changes=True,
            diff_text=f"+++ new content\n{current}",
            similarity_ratio=0.0,
            added_lines=len(current.splitlines()),
            removed_lines=0,
            added_chars=len(current),
        )
    
    if not current:
        return DiffResult(
            has_changes=True,
            diff_text=f"--- content removed\n{previous}",
            similarity_ratio=0.0,
            added_lines=0,
            removed_lines=len(previous.splitlines()),
            added_chars=0,
        )
    
    # Split into lines for diff
    prev_lines = previous.splitlines(keepends=True)
    curr_lines = current.splitlines(keepends=True)
    
    # Generate unified diff
    diff_lines = list(difflib.unified_diff(
        prev_lines,
        curr_lines,
        fromfile="previous",
        tofile="current",
        lineterm=""
    ))
    
    diff_text = "".join(diff_lines)
    
    # Calculate statistics
    added_lines = sum(1 for line in diff_lines if line.startswith("+") and not line.startswith("+++"))
    removed_lines = sum(1 for line in diff_lines if line.startswith("-") and not line.startswith("---"))
    
    # Count added characters (excluding diff markers)
    added_content = "".join(
        line[1:] for line in diff_lines 
        if line.startswith("+") and not line.startswith("+++")
    )
    added_chars = len(added_content.strip())
    
    # Calculate similarity ratio
    similarity_ratio = difflib.SequenceMatcher(None, previous, current).ratio()
    
    return DiffResult(
        has_changes=len(diff_lines) > 0,
        diff_text=diff_text,
        similarity_ratio=similarity_ratio,
        added_lines=added_lines,
        removed_lines=removed_lines,
        added_chars=added_chars,
    )


def is_meaningful_change(diff_result: DiffResult) -> bool:
    """
    Determine if a change is meaningful enough to report.
    
    Filters out:
    - Very minor changes (< 1% different)
    - Extremely large changes (> 95% different, likely error)
    - Changes with very little new content
    
    Args:
        diff_result: Result from compute_diff.
        
    Returns:
        True if the change should be reported.
    """
    if not diff_result.has_changes:
        return False
    
    change_ratio = 1 - diff_result.similarity_ratio
    
    # Too similar = noise (dates, counters, etc.)
    if change_ratio < MIN_CHANGE_RATIO:
        log.debug("change_too_minor", 
                 change_ratio=round(change_ratio, 4),
                 threshold=MIN_CHANGE_RATIO)
        return False
    
    # Too different = likely fetch error or site redesign
    if change_ratio > MAX_CHANGE_RATIO:
        log.warning("extreme_change_detected",
                   change_ratio=round(change_ratio, 4),
                   message="Site may have been redesigned or fetch failed")
        # Still return True but flag it - let human review
        return True
    
    # Not enough new content
    if diff_result.added_chars < MIN_ADDED_CHARS:
        log.debug("insufficient_new_content",
                 added_chars=diff_result.added_chars,
                 threshold=MIN_ADDED_CHARS)
        return False
    
    log.info("meaningful_change_detected",
            change_ratio=round(change_ratio, 4),
            added_lines=diff_result.added_lines,
            removed_lines=diff_result.removed_lines,
            added_chars=diff_result.added_chars)
    
    return True


def format_diff_summary(diff_result: DiffResult) -> str:
    """
    Generate a human-readable summary of changes.
    
    Args:
        diff_result: Result from compute_diff.
        
    Returns:
        Summary string.
    """
    if not diff_result.has_changes:
        return "No changes detected"
    
    parts = []
    
    change_pct = round((1 - diff_result.similarity_ratio) * 100, 1)
    parts.append(f"{change_pct}% changed")
    
    if diff_result.added_lines:
        parts.append(f"+{diff_result.added_lines} lines")
    if diff_result.removed_lines:
        parts.append(f"-{diff_result.removed_lines} lines")
    
    return ", ".join(parts)