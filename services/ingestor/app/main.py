import hashlib
import json
import difflib
from contextlib import contextmanager

from sqlalchemy import text
from sqlalchemy.orm import Session

from .db import SessionLocal
from .queries import INSERT_WACHET_CHANGE
from .wachete_client import get_recent_changes_real  # 👈 cambio aquí


@contextmanager
def get_session() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def compute_change_hash(
    wachet_id: str,
    previous_text: str,
    current_text: str,
    notification_id: str | None = None,
) -> str:
    """
    Generates a stable hash using ids plus before/after content to help dedupe.
    """
    base = f"{wachet_id}|{notification_id or ''}|{previous_text}|{current_text}"
    return hashlib.sha256(base.encode("utf-8")).hexdigest()


def build_diff(previous_text: str, current_text: str) -> str:
    """
    Returns a unified diff string highlighting insertions/deletions.
    """
    prev_lines = (previous_text or "").splitlines()
    curr_lines = (current_text or "").splitlines()
    diff = difflib.unified_diff(
        prev_lines,
        curr_lines,
        fromfile="previous",
        tofile="current",
        lineterm="",
    )
    diff_str = "\n".join(diff)
    return diff_str if diff_str.strip() else ""


def ingest_changes():
    # Antes: changes = get_recent_changes_mock()
    changes = get_recent_changes_real(hours_back=24)
    inserted = 0
    skipped = 0

    with get_session() as db:
        for ch in changes:
            wachet_id = ch.get("wachet_id") or "desconocido"
            url = ch.get("url")
            title = ch.get("title")
            previous_text = ch.get("previous_text") or ""
            current_text = ch.get("current_text") or ""
            wachete_notification_id = ch.get("wachete_notification_id")
            raw_notification = ch.get("raw_notification")

            # Keep legacy raw_content for compatibility with existing UI helpers
            raw_content = ch.get("raw_content")
            if raw_content is None:
                raw_content = json.dumps(raw_notification or {}, ensure_ascii=False)

            diff_text = ch.get("diff_text") or build_diff(previous_text, current_text)
            if diff_text == "":
                diff_text = None

            change_hash = compute_change_hash(
                wachet_id=wachet_id,
                previous_text=previous_text,
                current_text=current_text,
                notification_id=wachete_notification_id,
            )

            exists = None
            if wachete_notification_id:
                exists = db.execute(
                    text(
                        """
                        SELECT 1
                        FROM wachet_changes
                        WHERE wachete_notification_id = :wachete_notification_id
                        """
                    ),
                    {"wachete_notification_id": wachete_notification_id},
                ).scalar()

            if not exists:
                exists = db.execute(
                    text(
                        """
                        SELECT 1
                        FROM wachet_changes
                        WHERE wachet_id = :wachet_id
                          AND change_hash = :change_hash
                        """
                    ),
                    {"wachet_id": wachet_id, "change_hash": change_hash},
                ).scalar()

            if exists:
                skipped += 1
                continue

            db.execute(
                INSERT_WACHET_CHANGE,
                {
                    "wachet_id": wachet_id,
                    "wachete_notification_id": wachete_notification_id,
                    "url": url,
                    "title": title,
                    "raw_content": raw_content,
                    "raw_notification": raw_notification,
                    "previous_text": previous_text,
                    "current_text": current_text,
                    "diff_text": diff_text,
                    "change_hash": change_hash,
                },
            )
            inserted += 1

        db.commit()

    print(f"Ingestor terminado. Insertados: {inserted}, omitidos (duplicados): {skipped}")


def main():
    print("Ejecutando ingestor de Wachete (REAL)...")
    ingest_changes()


if __name__ == "__main__":
    main()
