import difflib
import json
import logging
import time
from datetime import date, datetime
from typing import Any, Optional

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
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
# Diff columns added by migration 002 - may be missing in older DBs
OPTIONAL_DIFF_COLUMNS = ("previous_text", "current_text", "diff_text")

# ---------- Response Models (API Contract) ----------


class WachetChangeItem(BaseModel):
    """Single change item returned by the API."""

    id: int
    wachet_id: Optional[str] = None
    wachete_notification_id: Optional[str] = None
    url: Optional[str] = None
    title: Optional[str] = None
    importance: Optional[str] = None
    ai_score: Optional[float] = None
    ai_reason: Optional[str] = None
    status: Optional[str] = None
    headline: Optional[str] = None
    source_name: Optional[str] = None
    source_country: Optional[str] = None
    previous_text: Optional[str] = None
    current_text: Optional[str] = None
    diff_text: Optional[str] = None
    raw_content: Optional[str] = None
    raw_notification: Optional[Any] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class WachetChangesResponse(BaseModel):
    """Response for /wachet-changes endpoint."""

    items: list[WachetChangeItem]
    total: int


class SummaryItem(BaseModel):
    """Single summary row."""

    status: Optional[str] = None
    importance: Optional[str] = None
    total: int


class SummaryResponse(BaseModel):
    """Response for /wachet-changes/summary endpoint."""

    items: list[SummaryItem]


class HealthResponse(BaseModel):
    """Response for /health endpoint."""

    status: str
    version: str = "1.0.0"


class DbHealthResponse(BaseModel):
    """Response for /db-health endpoint."""

    db_ok: bool
    latency_ms: Optional[float] = None


class CountResponse(BaseModel):
    """Response for /wachet-changes/count endpoint."""

    count: int


class UpdateResponse(BaseModel):
    """Response for PATCH /wachet-changes/{id}."""

    ok: bool
    id: int
    status: str



# ---------- Alert Models ----------


class AlertDispatchCreate(BaseModel):
    change_id: Optional[int] = None
    email: str
    dispatch_date: date
    country_state: str
    alert_count: int = 1
    alert_type: str
    subject: str
    topic: str
    instance: str
    legislative_body: Optional[str] = None
    clients: Optional[str] = None


class AlertDispatchResponse(AlertDispatchCreate):
    id: int
    created_at: datetime


class AlertStatItem(BaseModel):
    year: int
    count: int


# ---------- Column Cache ----------

_columns_cache: dict[str, tuple[set[str], float]] = {}
_CACHE_TTL_SECONDS = 300  # 5 minutes


def get_existing_columns(db: Session, use_cache: bool = True) -> set[str]:
    """
    Returns the column names for wachet_changes in the current DB.
    Supports PostgreSQL (information_schema) and SQLite (PRAGMA).
    Results are cached for _CACHE_TTL_SECONDS to avoid repeated schema queries.
    """
    global _columns_cache

    dialect = db.bind.dialect.name if db.bind else "unknown"
    cache_key = f"wachet_changes_{dialect}"

    # Check cache
    if use_cache and cache_key in _columns_cache:
        cached_cols, cached_time = _columns_cache[cache_key]
        if time.time() - cached_time < _CACHE_TTL_SECONDS:
            return cached_cols

    try:
        if dialect == "sqlite":
            rows = db.execute(text("PRAGMA table_info('wachet_changes')")).all()
            cols = {row[1] for row in rows}
        else:
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
            cols = set(rows)

        # Update cache
        _columns_cache[cache_key] = (cols, time.time())
        return cols
    except Exception:
        logger.exception("No se pudieron leer las columnas de wachet_changes")
        return set()


@app.get("/health", response_model=HealthResponse)
def health():
    return HealthResponse(status="ok", version="1.0.0")


@app.get("/db-health", response_model=DbHealthResponse)
def db_health(db: Session = Depends(get_db)):
    start = time.time()
    try:
        result = db.execute(text("SELECT 1")).scalar()
        latency_ms = (time.time() - start) * 1000
        return DbHealthResponse(db_ok=bool(result), latency_ms=round(latency_ms, 2))
    except Exception:
        latency_ms = (time.time() - start) * 1000
        return DbHealthResponse(db_ok=False, latency_ms=round(latency_ms, 2))


@app.get("/wachet-changes/count", response_model=CountResponse)
def count_wachet_changes(db: Session = Depends(get_db)):
    result = db.execute(text("SELECT COUNT(*) FROM wachet_changes")).scalar()
    return CountResponse(count=result or 0)


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


def extract_before_after_from_raw(raw_notification: Any) -> tuple[str | None, str | None]:
    """
    Try to extract before/after text from raw_notification using common field names.
    Returns (before_text, after_text) tuple.
    """
    if not isinstance(raw_notification, dict):
        return None, None

    # Common field names for before/after content (Wachete uses comparand/current)
    before_keys = ("comparand", "before", "previous", "old", "content_before", "previous_text")
    after_keys = ("current", "after", "new", "content_after", "current_text")

    before_text = None
    after_text = None

    for key in before_keys:
        val = raw_notification.get(key)
        if val and isinstance(val, str) and val.strip():
            before_text = val.strip()
            break

    for key in after_keys:
        val = raw_notification.get(key)
        if val and isinstance(val, str) and val.strip():
            after_text = val.strip()
            break

    return before_text, after_text


def compute_diff(prev: str, curr: str) -> str | None:
    """Compute unified diff between previous and current text."""
    diff = "\n".join(
        difflib.unified_diff(
            prev.splitlines(),
            curr.splitlines(),
            fromfile="previous",
            tofile="current",
            lineterm="",
        )
    )
    return diff if diff.strip() else None


def persist_computed_fields(
    db: Session,
    change_id: int,
    previous_text: str | None,
    current_text: str | None,
    diff_text: str | None,
    existing_columns: set[str],
) -> None:
    """
    Persist computed previous_text, current_text, diff_text back to DB.
    Only updates fields if they are empty in DB and column exists.
    """
    if "diff_text" not in existing_columns:
        return  # Migration not applied yet

    updates: list[str] = []
    params: dict[str, Any] = {"id": change_id}

    if previous_text and "previous_text" in existing_columns:
        updates.append("previous_text = COALESCE(NULLIF(previous_text, ''), :previous_text)")
        params["previous_text"] = previous_text

    if current_text and "current_text" in existing_columns:
        updates.append("current_text = COALESCE(NULLIF(current_text, ''), :current_text)")
        params["current_text"] = current_text

    if diff_text and "diff_text" in existing_columns:
        updates.append("diff_text = COALESCE(NULLIF(diff_text, ''), :diff_text)")
        params["diff_text"] = diff_text

    if not updates:
        return

    query = f"UPDATE wachet_changes SET {', '.join(updates)} WHERE id = :id"
    try:
        db.execute(text(query), params)
        # Don't commit here - let caller handle transaction
    except Exception:
        logger.debug("Failed to persist computed fields for id=%s", change_id)


def process_change_item(
    row: dict,
    db: Session | None = None,
    existing_columns: set[str] | None = None,
    persist: bool = False,
) -> dict:
    """
    Process a single change row:
    - Normalize raw_notification
    - Derive previous_text/current_text from raw_notification if missing
    - Compute diff_text if missing
    - Optionally persist computed fields back to DB
    """
    item = dict(row)
    raw_notif = normalize_raw_notification(item.get("raw_notification"))
    item["raw_notification"] = raw_notif

    # Get or derive previous/current text
    prev = item.get("previous_text") or ""
    curr = item.get("current_text") or ""
    derived_prev = None
    derived_curr = None

    if not prev.strip() or not curr.strip():
        derived_before, derived_after = extract_before_after_from_raw(raw_notif)
        if not prev.strip() and derived_before:
            item["previous_text"] = derived_before
            derived_prev = derived_before
            prev = derived_before
        if not curr.strip() and derived_after:
            item["current_text"] = derived_after
            derived_curr = derived_after
            curr = derived_after

    # Compute diff if not present
    computed_diff = None
    if not item.get("diff_text"):
        computed_diff = compute_diff(prev, curr)
        item["diff_text"] = computed_diff

    # Persist if enabled and we computed new values
    if persist and db is not None and existing_columns is not None:
        if derived_prev or derived_curr or computed_diff:
            persist_computed_fields(
                db=db,
                change_id=item["id"],
                previous_text=derived_prev,
                current_text=derived_curr,
                diff_text=computed_diff,
                existing_columns=existing_columns,
            )

    return item


@app.get("/wachet-changes", response_model=WachetChangesResponse)
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
        "created_at",
        "updated_at",
    ]

    missing_columns: list[str] = []
    select_columns = base_columns.copy()

    # Handle optional columns (headline, source_name, source_country)
    for col in OPTIONAL_CHANGE_COLUMNS:
        if col in existing_columns:
            select_columns.append(col)
        else:
            select_columns.append(f"NULL AS {col}")
            missing_columns.append(col)

    # Handle diff columns (previous_text, current_text, diff_text)
    for col in OPTIONAL_DIFF_COLUMNS:
        if col in existing_columns:
            select_columns.append(col)
        else:
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

    items = [
        process_change_item(
            row=dict(r),
            db=db,
            existing_columns=existing_columns,
            persist=True,  # Enable save-on-read for computed fields
        )
        for r in rows
    ]

    # Best-effort commit for any persisted fields
    try:
        db.commit()
    except Exception:
        pass

    return WachetChangesResponse(items=items, total=len(items))


@app.get("/wachet-changes/filtered", response_model=WachetChangesResponse)
def list_filtered_changes(
    importance: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    Lista cambios con status = 'FILTERED' o 'PENDING' (legacy endpoint).
    Puedes usar /wachet-changes?status=FILTERED en su lugar.
    """
    existing_columns = get_existing_columns(db)

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
               raw_notification,
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
    items = [
        process_change_item(
            row=dict(r),
            db=db,
            existing_columns=existing_columns,
            persist=True,
        )
        for r in rows
    ]

    # Best-effort commit for any persisted fields
    try:
        db.commit()
    except Exception:
        pass

    return WachetChangesResponse(items=items, total=len(items))


@app.get("/wachet-changes/summary", response_model=SummaryResponse)
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
    return SummaryResponse(items=[SummaryItem(**dict(r)) for r in rows])


# --------- Actualización de estado ---------


class ChangeUpdate(BaseModel):
    status: Optional[str] = None


@app.patch("/wachet-changes/{change_id}", response_model=UpdateResponse)
def update_wachet_change(
    change_id: int,
    payload: ChangeUpdate,
    db: Session = Depends(get_db),
):
    """
    Actualiza el status de un cambio.
    Soporta: NEW, PENDING, FILTERED, VALIDATED, PUBLISHED, DISCARDED.
    """
    if payload.status is None:
        raise HTTPException(status_code=400, detail="Debes enviar un status")

    # Validación del status
    if payload.status not in ALLOWED_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Status no válido. Usa uno de: {', '.join(sorted(ALLOWED_STATUSES))}"
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
    return UpdateResponse(ok=True, id=change_id, status=payload.status)


# ---------- Alert Dispatch System ----------


@app.post("/alerts", response_model=AlertDispatchResponse)
def create_alert(alert: AlertDispatchCreate, db: Session = Depends(get_db)):
    """
    Registers a new alert dispatch.
    """
    query = text(
        """
        INSERT INTO alert_dispatches (
            change_id, email, dispatch_date, country_state, alert_count,
            alert_type, subject, topic, instance, legislative_body, clients
        ) VALUES (
            :change_id, :email, :dispatch_date, :country_state, :alert_count,
            :alert_type, :subject, :topic, :instance, :legislative_body, :clients
        )
        RETURNING id, created_at
        """
    )
    try:
        result = db.execute(
            query,
            alert.model_dump()
        ).fetchone()
        db.commit()
        
        # Return complete object
        data = alert.model_dump()
        data["id"] = result.id
        data["created_at"] = result.created_at
        return AlertDispatchResponse(**data)
    except Exception as e:
        db.rollback()
        logger.exception("Error creating alert dispatch")
        raise HTTPException(status_code=500, detail="Error saving alert dispatch")


class AlertWithChangeResponse(AlertDispatchResponse):
    """Alert response with associated change info."""
    change_title: Optional[str] = None
    change_url: Optional[str] = None


@app.get("/alerts", response_model=list[AlertWithChangeResponse])
def get_all_alerts(
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """
    Get all registered alerts with associated change info.
    """
    query = text(
        """
        SELECT
            a.id, a.change_id, a.email, a.dispatch_date, a.country_state, a.alert_count,
            a.alert_type, a.subject, a.topic, a.instance, a.legislative_body, a.clients, a.created_at,
            w.title as change_title, w.url as change_url
        FROM alert_dispatches a
        LEFT JOIN wachet_changes w ON a.change_id = w.id
        ORDER BY a.created_at DESC
        LIMIT :limit OFFSET :offset
        """
    )
    rows = db.execute(query, {"limit": limit, "offset": offset}).mappings().all()
    return [AlertWithChangeResponse(**dict(r)) for r in rows]


@app.get("/alerts/by-change/{change_id}", response_model=list[AlertDispatchResponse])
def get_alerts_by_change(change_id: int, db: Session = Depends(get_db)):
    """
    Get all alerts registered for a specific change.
    """
    query = text(
        """
        SELECT
            id, change_id, email, dispatch_date, country_state, alert_count,
            alert_type, subject, topic, instance, legislative_body, clients, created_at
        FROM alert_dispatches
        WHERE change_id = :change_id
        ORDER BY created_at DESC
        """
    )
    rows = db.execute(query, {"change_id": change_id}).mappings().all()
    return [AlertDispatchResponse(**dict(r)) for r in rows]


@app.get("/alerts/stats", response_model=list[AlertStatItem])
def get_alert_stats(year: int = 2026, db: Session = Depends(get_db)):
    """
    Get total alerts count for a specific year.
    Future: expanded stats.
    """
    dialect = db.bind.dialect.name if db.bind else "postgresql"
    if dialect == "sqlite":
        # SQLite uses strftime for year extraction from text/date
        condition = "strftime('%Y', dispatch_date) = :year"
        # Since parameter is int, logic might need casting, but let's try string comparison
        # Actually standard sqlite date is string YYYY-MM-DD.
        # :year is int.
        condition = "CAST(strftime('%Y', dispatch_date) AS INTEGER) = :year"
    else:
        condition = "EXTRACT(YEAR FROM dispatch_date) = :year"

    query = text(
        f"""
        SELECT COUNT(*) as count
        FROM alert_dispatches
        WHERE {condition}
        """
    )
    count = db.execute(query, {"year": year}).scalar()
    return [AlertStatItem(year=year, count=count or 0)]

