from typing import Optional

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from .db import get_db

app = FastAPI(title="Asertiva Monitoring API")

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
    query = """
        SELECT id,
               wachet_id,
               url,
               title,
               importance,
               ai_score,
               ai_reason,
               status,
               created_at,
               updated_at
        FROM wachet_changes
        WHERE 1 = 1
    """
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

    rows = db.execute(text(query), params).mappings().all()
    items = [dict(r) for r in rows]

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
               url,
               title,
               importance,
               ai_score,
               ai_reason,
               status,
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
    items = [dict(r) for r in rows]

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
