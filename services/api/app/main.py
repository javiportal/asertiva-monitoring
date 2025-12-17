import difflib
import json
import logging
from typing import Any, Optional

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from .db import get_db

app = FastAPI(title="Asertiva Monitoring API")

logger = logging.getLogger("wachet_changes")
if not logger.handlers:
    logging.basicConfig(level=logging.INFO)

# CORS abierto para desarrollo
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Estados permitidos
ALLOWED_STATUSES = {"NEW", "PENDING", "FILTERED", "VALIDATED", "PUBLISHED", "DISCARDED"}
OPTIONAL_CHANGE_COLUMNS = ("headline", "source_name", "source_country")


def get_existing_columns(db: Session) -> set[str]:
    """
    Returns the column names for wachet_changes in the current DB.
    Supports PostgreSQL (information_schema) and SQLite (PRAGMA).
    """
    try:
        dialect = db.bind.dialect.name if db.bind else ""
        if dialect == "sqlite":
            rows = db.execute(text("PRAGMA table_info('wachet_changes')")).all()
            return {row[1] for row in rows}

        rows = db.execute(
            text(
                """
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = current_schema()
                  AND table_name = 'wachet_changes'
                """
            )
        ).scalars()
        return set(rows)
    except Exception:
        logger.exception("No se pudieron leer las columnas de wachet_changes")
        return set()


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/db-health")
def db_health(db: Session = Depends(get_db)):
    result = db.execute(text("SELECT 1")).scalar()
    return {"db_ok": bool(result)}


@app.get("/wachet-changes/count")
def count_wachet_changes(db: Session = Depends(get_db)):
    result = db.execute(text("SELECT COUNT(*) FROM wachet_changes")).scalar()
    return {"count": result}


def normalize_raw_notification(value: Any) -> Any:
    """
    Return a JSON-friendly raw_notification regardless of whether it comes
    from JSONB (dict/list) or as a JSON string.
    """
    if value is None:
        return None
    if isinstance(value, (dict, list)):
        return value
    if isinstance(value, (bytes, bytearray, memoryview)):
        try:
            value = value.decode()
        except Exception:
            return None
    if isinstance(value, str):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return value
    return value


@app.get("/wachet-changes")
def list_changes(
    status: Optional[str] = None,
    importance: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    Lista TODOS los cambios de wachet_changes con filtros opcionales:
    - status (NEW, PENDING, FILTERED, VALIDATED, PUBLISHED, etc.)
    - importance (IMPORTANT, NOT_IMPORTANT)
    - search (busca en título, razón IA y URL)
    
    Si no se pasan filtros, devuelve TODOS los registros (cualquier status).
    """
    existing_columns = get_existing_columns(db)

    base_columns = [
        "id",
        "wachet_id",
        "wachete_notification_id",
        "url",
        "title",
        "importance",
        "ai_score",
        "ai_reason",
        "status",
        "raw_content",
        "raw_notification",
        "previous_text",
        "current_text",
        "diff_text",
        "created_at",
        "updated_at",
    ]

    missing_columns: list[str] = []
    select_columns = base_columns.copy()

    for col in OPTIONAL_CHANGE_COLUMNS:
        if col in existing_columns:
            select_columns.append(col)
        else:
            # Fallback to NULL to avoid crashing if migration wasn't applied.
            select_columns.append(f"NULL AS {col}")
            missing_columns.append(col)

    if missing_columns:
        logger.warning(
            "Faltan columnas en wachet_changes: %s (rellenando con NULL). "
            "Ejecuta las migraciones para obtener datos completos.",
            ", ".join(sorted(missing_columns)),
        )

    query = """
        SELECT {columns}
        FROM wachet_changes
        WHERE 1 = 1
    """
    query = query.format(columns=",\n               ".join(select_columns))
    params: dict[str, object] = {}

    if status:
        query += " AND status = :status"
        params["status"] = status

    if importance:
        query += " AND importance = :importance"
        params["importance"] = importance

    if search:
        query += " AND (title ILIKE :q OR ai_reason ILIKE :q OR url ILIKE :q)"
        params["q"] = f"%{search}%"

    query += " ORDER BY created_at DESC LIMIT 500"

    try:
        rows = db.execute(text(query), params).mappings().all()
    except SQLAlchemyError as exc:
        logger.exception("Error al consultar wachet_changes")
        raise HTTPException(
            status_code=500,
            detail="No se pudo consultar wachet_changes (revisa las migraciones de la tabla).",
        ) from exc

    items = []
    for r in rows:
        item = dict(r)
        item["raw_notification"] = normalize_raw_notification(
            item.get("raw_notification")
        )
        if not item.get("diff_text"):
            prev = item.get("previous_text") or ""
            curr = item.get("current_text") or ""
            diff = "\n".join(
                difflib.unified_diff(
                    prev.splitlines(),
                    curr.splitlines(),
                    fromfile="previous",
                    tofile="current",
                    lineterm="",
                )
            )
            item["diff_text"] = diff if diff.strip() else None
        items.append(item)

    return {
        "items": items,
        "total": len(items),
    }


@app.get("/wachet-changes/filtered")
def list_filtered_changes(
    importance: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    Lista cambios con status = 'FILTERED' o 'PENDING' (legacy endpoint).
    Puedes usar /wachet-changes?status=FILTERED en su lugar.
    """
    query = """
        SELECT id,
               wachet_id,
               wachete_notification_id,
               url,
               title,
               importance,
               ai_score,
               ai_reason,
                status,
               previous_text,
               current_text,
               diff_text,
                created_at,
                updated_at
        FROM wachet_changes
        WHERE status IN ('FILTERED', 'PENDING')
    """

    params: dict[str, object] = {}

    if importance:
        query += " AND importance = :importance"
        params["importance"] = importance

    if search:
        query += " AND (title ILIKE :q OR ai_reason ILIKE :q OR url ILIKE :q)"
        params["q"] = f"%{search}%"

    query += " ORDER BY created_at DESC LIMIT 100"

    rows = db.execute(text(query), params).mappings().all()
    items = []
    for r in rows:
        item = dict(r)
        if not item.get("diff_text"):
            prev = item.get("previous_text") or ""
            curr = item.get("current_text") or ""
            diff = "\n".join(
                difflib.unified_diff(
                    prev.splitlines(),
                    curr.splitlines(),
                    fromfile="previous",
                    tofile="current",
                    lineterm="",
                )
            )
            item["diff_text"] = diff if diff.strip() else None
        items.append(item)

    return {
        "items": items,
        "total": len(items),
    }


@app.get("/wachet-changes/summary")
def summary_changes(db: Session = Depends(get_db)):
    """
    Resumen por status + importancia (para las cards del dashboard).
    Agrupa NEW, PENDING/FILTERED, VALIDATED/PUBLISHED.
    """
    rows = db.execute(
        text(
            """
            SELECT
              status,
              importance,
              COUNT(*) AS total
            FROM wachet_changes
            GROUP BY status, importance
            ORDER BY status, importance
            """
        )
    ).mappings().all()
    return {"items": [dict(r) for r in rows]}


# --------- Actualización de estado ---------


class ChangeUpdate(BaseModel):
    status: Optional[str] = None


@app.patch("/wachet-changes/{change_id}")
def update_wachet_change(
    change_id: int,
    payload: ChangeUpdate,
    db: Session = Depends(get_db),
):
    """
    Actualiza el status de un cambio.
    Soporta: NEW, PENDING, FILTERED, VALIDATED, PUBLISHED.
    """
    if payload.status is None:
        raise HTTPException(status_code=400, detail="Debes enviar un status")
    
    # Validación opcional del status
    if payload.status not in ALLOWED_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Status no válido. Usa uno de: {', '.join(ALLOWED_STATUSES)}"
        )

    result = db.execute(
        text(
            """
            UPDATE wachet_changes
            SET status = :status,
                updated_at = NOW()
            WHERE id = :id
            """
        ),
        {"status": payload.status, "id": change_id},
    )

    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Cambio no encontrado")

    db.commit()
    return {"ok": True, "id": change_id, "status": payload.status}
