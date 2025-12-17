import json
import os
import sys
from pathlib import Path
import unittest

from fastapi.testclient import TestClient
from sqlalchemy import bindparam, create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy.types import JSON

BASE_DIR = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(BASE_DIR))
sys.modules.pop("app", None)
sys.modules.pop("app.main", None)

# Evita error de import si no hay DATABASE_URL en el entorno
os.environ.setdefault("DATABASE_URL", "sqlite:///./test_api.db")

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

CREATE_TABLE_SQL = """
CREATE TABLE wachet_changes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wachet_id TEXT,
    wachete_notification_id TEXT,
    url TEXT,
    title TEXT,
    importance TEXT,
    ai_score REAL,
    ai_reason TEXT,
    headline TEXT,
    source_name TEXT,
    source_country TEXT,
    status TEXT,
    raw_content TEXT,
    raw_notification JSON,
    previous_text TEXT,
    current_text TEXT,
    diff_text TEXT,
    change_hash TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT
);
"""

INSERT_SQL = text(
    """
    INSERT INTO wachet_changes (
        wachet_id, wachete_notification_id, url, title, importance, ai_score, ai_reason,
        headline, source_name, source_country, status, raw_content, raw_notification,
        previous_text, current_text, diff_text, change_hash
    )
    VALUES (
        :wachet_id, :wachete_notification_id, :url, :title, :importance, :ai_score, :ai_reason,
        :headline, :source_name, :source_country, :status, :raw_content, :raw_notification,
        :previous_text, :current_text, :diff_text, :change_hash
    )
    """
).bindparams(bindparam("raw_notification", type_=JSON))


CREATE_TABLE_SQL_MINIMAL = """
CREATE TABLE wachet_changes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wachet_id TEXT,
    wachete_notification_id TEXT,
    url TEXT,
    title TEXT,
    importance TEXT,
    ai_score REAL,
    ai_reason TEXT,
    status TEXT,
    raw_content TEXT,
    raw_notification JSON,
    previous_text TEXT,
    current_text TEXT,
    diff_text TEXT,
    change_hash TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT
);
"""

INSERT_SQL_MINIMAL = text(
    """
    INSERT INTO wachet_changes (
        wachet_id, wachete_notification_id, url, title,
        importance, ai_score, ai_reason, status, raw_content, raw_notification,
        previous_text, current_text, diff_text, change_hash
    )
    VALUES (
        :wachet_id, :wachete_notification_id, :url, :title,
        :importance, :ai_score, :ai_reason, :status, :raw_content, :raw_notification,
        :previous_text, :current_text, :diff_text, :change_hash
    )
    """
).bindparams(bindparam("raw_notification", type_=JSON))


def recreate_table(sql: str):
    with engine.begin() as conn:
        conn.execute(text("DROP TABLE IF EXISTS wachet_changes"))
        conn.execute(text(sql))


class WachetChangesEndpointTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        recreate_table(CREATE_TABLE_SQL)
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        cls.client.close()
        engine.dispose()

    def setUp(self):
        recreate_table(CREATE_TABLE_SQL)

    def test_returns_raw_notification_and_raw_content(self):
        raw_notification_dict = {"foo": "bar", "nested": {"value": 1}}
        raw_content_str = json.dumps(raw_notification_dict)
        params = {
            "wachet_id": "w1",
            "wachete_notification_id": "notif-1",
            "url": "https://example.test/page",
            "title": "Cambio de ejemplo",
            "importance": None,
            "ai_score": None,
            "ai_reason": None,
            "headline": None,
            "source_name": None,
            "source_country": None,
            "status": "NEW",
            "raw_content": raw_content_str,
            "raw_notification": raw_notification_dict,
            "previous_text": "antes",
            "current_text": "despues",
            "diff_text": None,
            "change_hash": "hash-123",
        }

        with engine.begin() as conn:
            conn.execute(INSERT_SQL, params)

        response = self.client.get("/wachet-changes")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["total"], 1)

        item = payload["items"][0]
        self.assertEqual(item["raw_notification"], raw_notification_dict)
        self.assertEqual(item["raw_content"], raw_content_str)
        self.assertEqual(item["wachet_id"], "w1")
        self.assertEqual(item["wachete_notification_id"], "notif-1")

    def test_handles_missing_optional_columns(self):
        recreate_table(CREATE_TABLE_SQL_MINIMAL)

        raw_notification_dict = {"foo": "bar"}
        params = {
            "wachet_id": "w2",
            "wachete_notification_id": "notif-2",
            "url": "https://example.test/without-optional",
            "title": "Cambio sin columnas opcionales",
            "importance": None,
            "ai_score": None,
            "ai_reason": None,
            "status": "NEW",
            "raw_content": json.dumps(raw_notification_dict),
            "raw_notification": raw_notification_dict,
            "previous_text": "prev",
            "current_text": "curr",
            "diff_text": None,
            "change_hash": "hash-456",
        }

        with engine.begin() as conn:
            conn.execute(INSERT_SQL_MINIMAL, params)

        response = self.client.get("/wachet-changes")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["total"], 1)

        item = payload["items"][0]
        self.assertEqual(item["wachet_id"], "w2")
        self.assertEqual(item["wachete_notification_id"], "notif-2")
        self.assertEqual(item["raw_notification"], raw_notification_dict)
        self.assertIsNone(item["headline"])
        self.assertIsNone(item["source_name"])
        self.assertIsNone(item["source_country"])


if __name__ == "__main__":
    unittest.main()
