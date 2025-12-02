import hashlib
from contextlib import contextmanager

from sqlalchemy import text
from sqlalchemy.orm import Session

from .db import SessionLocal
from .wachete_client import get_recent_changes_real  # 👈 cambio aquí


@contextmanager
def get_session() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def compute_change_hash(wachet_id: str, content: str) -> str:
    base = f"{wachet_id}|{content}"
    return hashlib.sha256(base.encode("utf-8")).hexdigest()


def ingest_changes():
    # Antes: changes = get_recent_changes_mock()
    changes = get_recent_changes_real(hours_back=24)
    inserted = 0
    skipped = 0

    with get_session() as db:
        for ch in changes:
            wachet_id = ch["wachet_id"]
            url = ch["url"]
            title = ch.get("title")
            content = ch.get("content") or ""
            change_hash = compute_change_hash(wachet_id, content)

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
                text(
                    """
                    INSERT INTO wachet_changes
                        (wachet_id, url, title, raw_content, change_hash, status)
                    VALUES
                        (:wachet_id, :url, :title, :raw_content, :change_hash, 'NEW')
                    """
                ),
                {
                    "wachet_id": wachet_id,
                    "url": url,
                    "title": title,
                    "raw_content": content,
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
