"""
Local Storage for WatchGuard Snapshots.

Uses SQLite to store:
- Last content hash per URL
- Previous text (for diff generation)
- Fetch history
"""

import sqlite3
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import structlog

from .config import get_config

log = structlog.get_logger()


@dataclass
class Snapshot:
    """A stored content snapshot."""
    url: str
    content_hash: str
    text: str  # Normalized text
    raw_text: str  # Original extracted text (for diff display)
    title: Optional[str]
    fetched_at: datetime
    
    
@dataclass  
class SnapshotComparison:
    """Result of comparing current fetch with stored snapshot."""
    has_previous: bool
    is_changed: bool
    previous: Optional[Snapshot]
    current: Snapshot


class Storage:
    """SQLite-based local storage for snapshots."""
    
    def __init__(self, db_path: Optional[str] = None):
        """
        Initialize storage.
        
        Args:
            db_path: Path to SQLite database. Defaults to config setting.
        """
        if db_path is None:
            config = get_config()
            db_path = config.settings.db_path
        
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        
        self._init_db()
    
    def _init_db(self):
        """Create tables if they don't exist."""
        with self._connect() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS snapshots (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    url TEXT NOT NULL,
                    content_hash TEXT NOT NULL,
                    normalized_text TEXT NOT NULL,
                    raw_text TEXT NOT NULL,
                    title TEXT,
                    fetched_at TEXT NOT NULL,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Index for fast lookups by URL
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_snapshots_url 
                ON snapshots(url)
            """)
            
            # Index for finding latest snapshot per URL
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_snapshots_url_fetched 
                ON snapshots(url, fetched_at DESC)
            """)
            
            conn.commit()
            log.debug("storage_initialized", db_path=str(self.db_path))
    
    @contextmanager
    def _connect(self):
        """Context manager for database connections."""
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()
    
    def get_latest_snapshot(self, url: str) -> Optional[Snapshot]:
        """
        Get the most recent snapshot for a URL.
        
        Args:
            url: The monitored URL.
            
        Returns:
            Most recent Snapshot or None if no history.
        """
        with self._connect() as conn:
            row = conn.execute("""
                SELECT url, content_hash, normalized_text, raw_text, title, fetched_at
                FROM snapshots
                WHERE url = ?
                ORDER BY fetched_at DESC
                LIMIT 1
            """, (url,)).fetchone()
            
            if not row:
                return None
            
            return Snapshot(
                url=row["url"],
                content_hash=row["content_hash"],
                text=row["normalized_text"],
                raw_text=row["raw_text"],
                title=row["title"],
                fetched_at=datetime.fromisoformat(row["fetched_at"]),
            )
    
    def save_snapshot(self, snapshot: Snapshot) -> int:
        """
        Save a new snapshot.
        
        Args:
            snapshot: Snapshot to save.
            
        Returns:
            ID of inserted row.
        """
        with self._connect() as conn:
            cursor = conn.execute("""
                INSERT INTO snapshots (url, content_hash, normalized_text, raw_text, title, fetched_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                snapshot.url,
                snapshot.content_hash,
                snapshot.text,
                snapshot.raw_text,
                snapshot.title,
                snapshot.fetched_at.isoformat(),
            ))
            conn.commit()
            
            log.debug("snapshot_saved", 
                     url=snapshot.url, 
                     hash=snapshot.content_hash[:12],
                     id=cursor.lastrowid)
            
            return cursor.lastrowid
    
    def compare_and_save(
        self, 
        url: str, 
        content_hash: str, 
        normalized_text: str,
        raw_text: str,
        title: Optional[str],
    ) -> SnapshotComparison:
        """
        Compare new content with stored snapshot and save if different.
        
        Args:
            url: The monitored URL.
            content_hash: Hash of normalized text.
            normalized_text: Normalized text for comparison.
            raw_text: Original extracted text for display.
            title: Page title.
            
        Returns:
            SnapshotComparison with previous snapshot and change status.
        """
        now = datetime.now(timezone.utc)
        
        # Create current snapshot object
        current = Snapshot(
            url=url,
            content_hash=content_hash,
            text=normalized_text,
            raw_text=raw_text,
            title=title,
            fetched_at=now,
        )
        
        # Get previous snapshot
        previous = self.get_latest_snapshot(url)
        
        if previous is None:
            # First time seeing this URL
            self.save_snapshot(current)
            log.info("first_snapshot", url=url)
            return SnapshotComparison(
                has_previous=False,
                is_changed=True,  # Treat first fetch as "changed"
                previous=None,
                current=current,
            )
        
        # Compare hashes
        is_changed = previous.content_hash != content_hash
        
        if is_changed:
            # Save new snapshot
            self.save_snapshot(current)
            log.info("content_changed", 
                    url=url,
                    old_hash=previous.content_hash[:12],
                    new_hash=content_hash[:12])
        else:
            log.debug("content_unchanged", url=url, hash=content_hash[:12])
        
        return SnapshotComparison(
            has_previous=True,
            is_changed=is_changed,
            previous=previous,
            current=current,
        )
    
    def get_all_urls(self) -> list[str]:
        """Get list of all monitored URLs with snapshots."""
        with self._connect() as conn:
            rows = conn.execute("""
                SELECT DISTINCT url FROM snapshots
            """).fetchall()
            return [row["url"] for row in rows]
    
    def get_snapshot_count(self, url: str) -> int:
        """Get number of snapshots for a URL."""
        with self._connect() as conn:
            row = conn.execute("""
                SELECT COUNT(*) as count FROM snapshots WHERE url = ?
            """, (url,)).fetchone()
            return row["count"]
    
    def cleanup_old_snapshots(self, url: str, keep_count: int = 10):
        """
        Remove old snapshots, keeping only the most recent N.
        
        Args:
            url: URL to clean up.
            keep_count: Number of recent snapshots to keep.
        """
        with self._connect() as conn:
            # Get IDs to keep
            keep_ids = conn.execute("""
                SELECT id FROM snapshots 
                WHERE url = ?
                ORDER BY fetched_at DESC
                LIMIT ?
            """, (url, keep_count)).fetchall()
            
            keep_id_list = [row["id"] for row in keep_ids]
            
            if not keep_id_list:
                return
            
            # Delete older snapshots
            placeholders = ",".join("?" * len(keep_id_list))
            deleted = conn.execute(f"""
                DELETE FROM snapshots 
                WHERE url = ? AND id NOT IN ({placeholders})
            """, [url] + keep_id_list)
            
            conn.commit()
            
            if deleted.rowcount > 0:
                log.info("cleaned_old_snapshots", 
                        url=url, 
                        deleted=deleted.rowcount,
                        kept=keep_count)


# Singleton storage instance
_storage: Optional[Storage] = None


def get_storage() -> Storage:
    """Get the global storage instance."""
    global _storage
    if _storage is None:
        _storage = Storage()
    return _storage