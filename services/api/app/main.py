from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from .db import get_db

app = FastAPI(title="Asertiva Monitoring API")

# CORS abierto para desarrollo: permite llamadas desde localhost:3000
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # si quieres, luego lo cambias a ["http://localhost:3000"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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


@app.get("/wachet-changes/filtered")
def list_filtered_changes(db: Session = Depends(get_db)):
    rows = db.execute(
        text(
            """
            SELECT id, wachet_id, url, title, importance, ai_score, ai_reason,
                   status, created_at
            FROM wachet_changes
            WHERE status = 'FILTERED'
            ORDER BY created_at DESC
            LIMIT 100
            """
        )
    ).mappings().all()
    return {"items": [dict(r) for r in rows]}


@app.get("/wachet-changes/summary")
def summary_changes(db: Session = Depends(get_db)):
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
