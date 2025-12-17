from sqlalchemy import bindparam, text
from sqlalchemy.dialects.postgresql import JSONB

INSERT_WACHET_CHANGE = (
    text(
        """
        INSERT INTO wachet_changes
            (wachet_id, wachete_notification_id, url, title, raw_content, raw_notification, previous_text, current_text, diff_text, change_hash, status)
        VALUES
            (:wachet_id, :wachete_notification_id, :url, :title, :raw_content, :raw_notification, :previous_text, :current_text, :diff_text, :change_hash, 'NEW')
        """
    ).bindparams(bindparam("raw_notification", type_=JSONB))
)
