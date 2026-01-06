import json
import os
import sys
from datetime import date
from pathlib import Path
import unittest

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Setup path to import app
BASE_DIR = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(BASE_DIR))
sys.modules.pop("app", None)
sys.modules.pop("app.main", None)

os.environ.setdefault("DATABASE_URL", "sqlite:///./test_alerts.db")

from app import db as db_module  # noqa: E402
from app.main import app  # noqa: E402


TEST_DB_URL = "sqlite://"
engine = create_engine(
    TEST_DB_URL,
    future=True,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(
    bind=engine, autoflush=False, autocommit=False, future=True
)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[db_module.get_db] = override_get_db


CREATE_WACHET_TABLE = """
CREATE TABLE wachet_changes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
"""

CREATE_ALERTS_TABLE = """
CREATE TABLE alert_dispatches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    change_id INTEGER,
    email TEXT NOT NULL,
    dispatch_date DATE NOT NULL,
    country_state TEXT NOT NULL,
    alert_count INTEGER NOT NULL DEFAULT 1,
    alert_type TEXT NOT NULL,
    subject TEXT NOT NULL,
    topic TEXT NOT NULL,
    instance TEXT NOT NULL,
    legislative_body TEXT,
    clients TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(change_id) REFERENCES wachet_changes(id)
);
"""

INSERT_WACHET = text("INSERT INTO wachet_changes (title) VALUES (:title)")

class AlertsEndpointTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def setUp(self):
        # Re-create tables before each test
        with engine.begin() as conn:
            conn.execute(text("DROP TABLE IF EXISTS alert_dispatches"))
            conn.execute(text("DROP TABLE IF EXISTS wachet_changes"))
            conn.execute(text(CREATE_WACHET_TABLE))
            conn.execute(text(CREATE_ALERTS_TABLE))
            conn.execute(INSERT_WACHET, {"title": "Test Change"})

    def test_create_alert(self):
        payload = {
            "change_id": 1,
            "email": "test@example.com",
            "dispatch_date": str(date.today()),
            "country_state": "México",
            "alert_count": 5,
            "alert_type": "Regulatoria",
            "subject": "Bancario",
            "topic": "Test Topic",
            "instance": "Organismos Autónomos",
            "clients": "Client A, Client B"
        }
        
        response = self.client.post("/alerts", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["email"], "test@example.com")
        self.assertEqual(data["id"], 1)

        # Verify DB persistence
        response_get = self.client.get("/alerts/by-change/1")
        self.assertEqual(response_get.status_code, 200)
        items = response_get.json()
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["topic"], "Test Topic")

    def test_create_alert_missing_fields(self):
        payload = {
            "email": "test@example.com"
            # Missing required fields
        }
        response = self.client.post("/alerts", json=payload)
        self.assertEqual(response.status_code, 422)

    def test_get_stats(self):
        # Create 2 alerts for 2026
        payload = {
            "change_id": 1,
            "email": "test@example.com",
            "dispatch_date": "2026-05-20",
            "country_state": "México",
            "alert_count": 1,
            "alert_type": "Regulatoria",
            "subject": "Bancario",
            "topic": "Topic A",
            "instance": "X"
        }
        self.client.post("/alerts", json=payload)
        self.client.post("/alerts", json=payload)

        # Create 1 alert for 2025
        payload2025 = payload.copy()
        payload2025["dispatch_date"] = "2025-05-20"
        self.client.post("/alerts", json=payload2025)

        response = self.client.get("/alerts/stats?year=2026")
        self.assertEqual(response.status_code, 200)
        stats = response.json()
        self.assertEqual(len(stats), 1)
        self.assertEqual(stats[0]["year"], 2026)
        self.assertEqual(stats[0]["count"], 2)


if __name__ == "__main__":
    unittest.main()
