-- Migration: Extend wachet_changes to store before/after content and Wachete metadata
-- Run with: psql "$DATABASE_URL" -f migrations/002_add_wachete_diff_fields.sql

ALTER TABLE wachet_changes
ADD COLUMN IF NOT EXISTS wachete_notification_id TEXT NULL;

ALTER TABLE wachet_changes
ADD COLUMN IF NOT EXISTS previous_text TEXT NULL;

ALTER TABLE wachet_changes
ADD COLUMN IF NOT EXISTS current_text TEXT NULL;

ALTER TABLE wachet_changes
ADD COLUMN IF NOT EXISTS diff_text TEXT NULL;

ALTER TABLE wachet_changes
ADD COLUMN IF NOT EXISTS raw_notification JSONB NULL;

-- Natural key for deduping a specific notification.
CREATE UNIQUE INDEX IF NOT EXISTS ux_wachet_changes_notification_id
ON wachet_changes (wachete_notification_id)
WHERE wachete_notification_id IS NOT NULL;
