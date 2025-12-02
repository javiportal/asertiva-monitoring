from contextlib import contextmanager

from sqlalchemy import text
from sqlalchemy.orm import Session

from .db import SessionLocal
from .ai_client import classify_change, AIFilterError


@contextmanager
def get_session() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def fetch_new_changes(db: Session, limit: int = 50):
    """
    Obtiene cambios con status NEW para clasificar.
    """
    rows = db.execute(
        text(
            """
            SELECT id, title, raw_content, url
            FROM wachet_changes
            WHERE status = 'NEW'
            ORDER BY created_at ASC
            LIMIT :limit
            """
        ),
        {"limit": limit},
    ).mappings().all()
    return rows


def classify_pending_changes(batch_size: int = 50):
    processed = 0
    updated = 0
    errors = 0

    with get_session() as db:
        while True:
            rows = fetch_new_changes(db, limit=batch_size)
            if not rows:
                break

            for row in rows:
                change_id = row["id"]
                title = row["title"]
                content = row["raw_content"] or ""
                url = row["url"]

                try:
                    result = classify_change(title=title, content=content, url=url)
                except AIFilterError as e:
                    print(f"[ERROR] Falló clasificación para id={change_id}: {e}")
                    # Si quieres, podrías marcar status='ERROR' aquí
                    db.execute(
                        text(
                            """
                            UPDATE wachet_changes
                            SET status = 'ERROR', updated_at = NOW()
                            WHERE id = :id
                            """
                        ),
                        {"id": change_id},
                    )
                    errors += 1
                    continue

                importance = result.get("importance") or "NOT_IMPORTANT"
                score = result.get("score") or 0.0
                reason = result.get("reason") or ""

                db.execute(
                    text(
                        """
                        UPDATE wachet_changes
                        SET
                            importance = :importance,
                            ai_score = :score,
                            ai_reason = :reason,
                            status = 'FILTERED',
                            updated_at = NOW()
                        WHERE id = :id
                        """
                    ),
                    {
                        "id": change_id,
                        "importance": importance,
                        "score": score,
                        "reason": reason,
                    },
                )
                updated += 1
                processed += 1

            db.commit()

    print(
        f"Filtro IA terminado. Procesados: {processed}, actualizados: {updated}, errores: {errors}"
    )


def main():
    print("Ejecutando worker de filtrado IA...")
    classify_pending_changes()


if __name__ == "__main__":
    main()
