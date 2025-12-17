import json
from contextlib import contextmanager

from sqlalchemy import text
from sqlalchemy.orm import Session

from .db import SessionLocal
from .ai_client import classify_change, AIFilterError
from .diff_utils import build_diff, is_trivial_diff


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
            SELECT
                id,
                title,
                raw_content,
                raw_notification,
                previous_text,
                current_text,
                diff_text,
                url,
                created_at
            FROM wachet_changes
            WHERE status = 'NEW'
            ORDER BY created_at ASC
            LIMIT :limit
            """
        ),
        {"limit": limit},
    ).mappings().all()
    return rows


def load_notification(raw_notification, raw_content: str | None):
    if isinstance(raw_notification, dict):
        return raw_notification
    if isinstance(raw_notification, str):
        try:
            return json.loads(raw_notification)
        except json.JSONDecodeError:
            return {}
    if raw_content:
        try:
            return json.loads(raw_content)
        except json.JSONDecodeError:
            return {}
    return {}


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
                url = row["url"]
                prev = row.get("previous_text") or ""
                curr = row.get("current_text") or ""
                diff_text = row.get("diff_text") or build_diff(prev, curr)
                raw_notification = load_notification(
                    row.get("raw_notification"), row.get("raw_content")
                )
                task_name = (
                    raw_notification.get("taskName")
                    or raw_notification.get("name")
                    or raw_notification.get("task", {}).get("name")
                    or title
                )
                timestamp = (
                    raw_notification.get("timestamp")
                    or raw_notification.get("date")
                    or raw_notification.get("createdAt")
                    or raw_notification.get("time")
                )
                created_at = row.get("created_at")
                if not timestamp and created_at:
                    try:
                        timestamp = created_at.isoformat()
                    except AttributeError:
                        timestamp = str(created_at)

                text_fallback = ""
                raw_content = row.get("raw_content") or ""
                if not curr and raw_content:
                    try:
                        parsed_raw = json.loads(raw_content)
                        text_fallback = (
                            parsed_raw.get("current")
                            or parsed_raw.get("comparand")
                            or parsed_raw.get("content")
                            or parsed_raw.get("html")
                            or raw_content
                        )
                    except json.JSONDecodeError:
                        text_fallback = raw_content

                # Regla previa: si parece un cambio numérico trivial, lo marcamos sin IA
                if diff_text and is_trivial_diff(diff_text):
                    db.execute(
                        text(
                            """
                            UPDATE wachet_changes
                            SET
                                importance = 'NOT_IMPORTANT',
                                ai_score = 0.05,
                                ai_reason = 'Cambio menor (contador/fecha). Clasificado automáticamente.',
                                diff_text = COALESCE(diff_text, :diff_text),
                                status = 'FILTERED',
                                updated_at = NOW()
                            WHERE id = :id
                            """
                        ),
                        {"id": change_id, "diff_text": diff_text},
                    )
                    updated += 1
                    processed += 1
                    continue

                try:
                    result = classify_change(
                        title=title,
                        diff_text=diff_text,
                        current_snippet=(curr or text_fallback)[:800] if (curr or text_fallback) else None,
                        previous_text=prev or None,
                        current_text=curr or None,
                        url=url,
                        task_name=task_name,
                        timestamp=timestamp,
                    )
                except AIFilterError as e:
                    print(f"[ERROR] Falló clasificación para id={change_id}: {e}")
                    db.execute(
                        text(
                            """
                            UPDATE wachet_changes
                            SET status = 'ERROR', updated_at = NOW(), diff_text = COALESCE(diff_text, :diff_text)
                            WHERE id = :id
                            """
                        ),
                        {"id": change_id, "diff_text": diff_text},
                    )
                    errors += 1
                    continue

                importance = result.get("importance") or "NOT_IMPORTANT"
                score = result.get("score") or 0.0
                reason = result.get("reason") or ""
                headline = result.get("headline") or ""
                source_name = result.get("source_name") or ""
                source_country = result.get("source_country") or ""

                db.execute(
                    text(
                        """
                        UPDATE wachet_changes
                        SET
                            importance = :importance,
                            ai_score = :score,
                            ai_reason = :reason,
                            diff_text = COALESCE(diff_text, :diff_text),
                            headline = :headline,
                            source_name = :source_name,
                            source_country = :source_country,
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
                            "diff_text": diff_text,
                            "headline": headline,
                            "source_name": source_name,
                            "source_country": source_country,
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
