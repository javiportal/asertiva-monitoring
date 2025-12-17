import json
import sys
import unittest
from pathlib import Path

from sqlalchemy import create_engine, text

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from app.queries import INSERT_WACHET_CHANGE  # noqa: E402


CREATE_TABLE_SQL = """
CREATE TABLE wachet_changes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wachet_id TEXT,
    wachete_notification_id TEXT,
    url TEXT,
    title TEXT,
    raw_content TEXT,
    raw_notification JSON,
    previous_text TEXT,
    current_text TEXT,
    diff_text TEXT,
    change_hash TEXT,
    status TEXT
)
"""


class RawNotificationInsertTest(unittest.TestCase):
    def test_insert_accepts_dict_raw_notification(self):
        engine = create_engine("sqlite:///:memory:", future=True)
        raw_notification = {"foo": "bar", "nested": {"value": 1}}
        raw_content = json.dumps(raw_notification, ensure_ascii=False)

        params = {
            "wachet_id": "w1",
            "wachete_notification_id": "notif-123",
            "url": "https://example.test/page",
            "title": "Cambio de ejemplo",
            "raw_content": raw_content,
            "raw_notification": raw_notification,
            "previous_text": "antes",
            "current_text": "despues",
            "diff_text": "diff",
            "change_hash": "hash-abc",
        }

        with engine.begin() as conn:
            conn.execute(text(CREATE_TABLE_SQL))
            conn.execute(INSERT_WACHET_CHANGE, params)
            stored_notification, stored_content = conn.execute(
                text("SELECT raw_notification, raw_content FROM wachet_changes")
            ).one()
        engine.dispose()

        self.assertEqual(json.loads(stored_notification), raw_notification)
        self.assertEqual(stored_content, raw_content)


if __name__ == "__main__":
    unittest.main()
