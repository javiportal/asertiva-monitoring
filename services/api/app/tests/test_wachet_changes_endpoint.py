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


class WachetChangesDiffFallbackTest(unittest.TestCase):
    """
    Tests for fallback logic that derives previous_text/current_text from raw_notification
    when DB columns are null or missing.
    """

    @classmethod
    def setUpClass(cls):
        recreate_table(CREATE_TABLE_SQL)
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        cls.client.close()

    def setUp(self):
        recreate_table(CREATE_TABLE_SQL)

    def test_derives_before_after_from_raw_notification(self):
        """
        When previous_text and current_text are NULL in DB,
        the endpoint should derive them from raw_notification (comparand/current fields).
        """
        raw_notification_dict = {
            "comparand": "This is the previous content",
            "current": "This is the current content",
            "taskId": "12345",
        }
        params = {
            "wachet_id": "w-derive",
            "wachete_notification_id": "notif-derive",
            "url": "https://example.test/page",
            "title": "Test Derivation",
            "importance": None,
            "ai_score": None,
            "ai_reason": None,
            "headline": None,
            "source_name": None,
            "source_country": None,
            "status": "NEW",
            "raw_content": json.dumps(raw_notification_dict),
            "raw_notification": raw_notification_dict,
            "previous_text": None,  # NULL in DB
            "current_text": None,   # NULL in DB
            "diff_text": None,
            "change_hash": "hash-derive",
        }

        with engine.begin() as conn:
            conn.execute(INSERT_SQL, params)

        response = self.client.get("/wachet-changes")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["total"], 1)

        item = payload["items"][0]
        # Should derive from raw_notification
        self.assertEqual(item["previous_text"], "This is the previous content")
        self.assertEqual(item["current_text"], "This is the current content")
        # Diff should be computed
        self.assertIsNotNone(item["diff_text"])
        self.assertIn("-This is the previous content", item["diff_text"])
        self.assertIn("+This is the current content", item["diff_text"])

    def test_uses_db_values_when_present(self):
        """
        When previous_text and current_text are present in DB,
        they should be used instead of deriving from raw_notification.
        """
        raw_notification_dict = {
            "comparand": "RAW previous",
            "current": "RAW current",
        }
        params = {
            "wachet_id": "w-db-values",
            "wachete_notification_id": "notif-db-values",
            "url": "https://example.test/page",
            "title": "Test DB Values",
            "importance": "IMPORTANT",
            "ai_score": 0.85,
            "ai_reason": "Test reason",
            "headline": None,
            "source_name": None,
            "source_country": None,
            "status": "NEW",
            "raw_content": json.dumps(raw_notification_dict),
            "raw_notification": raw_notification_dict,
            "previous_text": "DB previous content",  # Present in DB
            "current_text": "DB current content",     # Present in DB
            "diff_text": None,
            "change_hash": "hash-db-values",
        }

        with engine.begin() as conn:
            conn.execute(INSERT_SQL, params)

        response = self.client.get("/wachet-changes")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["total"], 1)

        item = payload["items"][0]
        # Should use DB values, not raw_notification
        self.assertEqual(item["previous_text"], "DB previous content")
        self.assertEqual(item["current_text"], "DB current content")

    def test_computes_diff_from_derived_values(self):
        """
        Even when before/after are derived from raw_notification,
        the diff should be correctly computed.
        """
        raw_notification_dict = {
            "comparand": "Line 1\nLine 2\nLine 3",
            "current": "Line 1\nLine 2 modified\nLine 3\nLine 4 new",
        }
        params = {
            "wachet_id": "w-diff-compute",
            "wachete_notification_id": "notif-diff-compute",
            "url": "https://example.test/page",
            "title": "Test Diff Compute",
            "importance": None,
            "ai_score": None,
            "ai_reason": None,
            "headline": None,
            "source_name": None,
            "source_country": None,
            "status": "NEW",
            "raw_content": json.dumps(raw_notification_dict),
            "raw_notification": raw_notification_dict,
            "previous_text": "",   # Empty string in DB
            "current_text": "",    # Empty string in DB
            "diff_text": None,
            "change_hash": "hash-diff-compute",
        }

        with engine.begin() as conn:
            conn.execute(INSERT_SQL, params)

        response = self.client.get("/wachet-changes")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        item = payload["items"][0]

        # Verify diff contains expected changes
        self.assertIsNotNone(item["diff_text"])
        self.assertIn("-Line 2", item["diff_text"])
        self.assertIn("+Line 2 modified", item["diff_text"])
        self.assertIn("+Line 4 new", item["diff_text"])


class WachetChangesMissingDiffColumnsTest(unittest.TestCase):
    """
    Tests for endpoint behavior when diff columns (previous_text, current_text, diff_text)
    don't exist in the database schema.
    """

    CREATE_TABLE_NO_DIFF = """
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
        change_hash TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT
    );
    """

    INSERT_NO_DIFF = text(
        """
        INSERT INTO wachet_changes (
            wachet_id, wachete_notification_id, url, title,
            importance, ai_score, ai_reason, headline, source_name, source_country,
            status, raw_content, raw_notification, change_hash
        )
        VALUES (
            :wachet_id, :wachete_notification_id, :url, :title,
            :importance, :ai_score, :ai_reason, :headline, :source_name, :source_country,
            :status, :raw_content, :raw_notification, :change_hash
        )
        """
    ).bindparams(bindparam("raw_notification", type_=JSON))

    @classmethod
    def setUpClass(cls):
        recreate_table(cls.CREATE_TABLE_NO_DIFF)
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        cls.client.close()
        recreate_table(CREATE_TABLE_SQL)  # Restore full schema

    def setUp(self):
        recreate_table(self.CREATE_TABLE_NO_DIFF)

    def test_endpoint_works_without_diff_columns(self):
        """
        Endpoint should return 200 and derive before/after from raw_notification
        even when the DB schema lacks previous_text/current_text/diff_text columns.
        """
        raw_notification_dict = {
            "comparand": "Before without column",
            "current": "After without column",
            "taskName": "Test Task",
        }
        params = {
            "wachet_id": "w-no-diff-cols",
            "wachete_notification_id": "notif-no-diff-cols",
            "url": "https://example.test/no-diff",
            "title": "Test Without Diff Columns",
            "importance": "IMPORTANT",
            "ai_score": 0.9,
            "ai_reason": "This is a test",
            "headline": "Test Headline",
            "source_name": "Test Source",
            "source_country": "Colombia",
            "status": "NEW",
            "raw_content": json.dumps(raw_notification_dict),
            "raw_notification": raw_notification_dict,
            "change_hash": "hash-no-diff-cols",
        }

        with engine.begin() as conn:
            conn.execute(self.INSERT_NO_DIFF, params)

        response = self.client.get("/wachet-changes")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["total"], 1)

        item = payload["items"][0]
        # Should derive from raw_notification
        self.assertEqual(item["previous_text"], "Before without column")
        self.assertEqual(item["current_text"], "After without column")
        # Diff should be computed
        self.assertIsNotNone(item["diff_text"])


if __name__ == "__main__":
    unittest.main()
