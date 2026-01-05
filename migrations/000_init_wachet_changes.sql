-- Migration 000: Create base wachet_changes table
-- Run with: psql "$DATABASE_URL" -f migrations/000_init_wachet_changes.sql
--
-- This creates the initial table structure. Subsequent migrations (001, 002)
-- add additional columns for AI fields and Wachete diff data.

CREATE TABLE IF NOT EXISTS wachet_changes (
    id SERIAL PRIMARY KEY,

    -- Wachete identifiers
    wachet_id TEXT NOT NULL,
    wachete_notification_id TEXT,

    -- Basic change info
    url TEXT,
    title TEXT,

    -- AI classification fields
    importance TEXT,                    -- 'IMPORTANT' or 'NOT_IMPORTANT'
    ai_score FLOAT,                     -- Confidence score 0.0 - 1.0
    ai_reason TEXT,                     -- Explanation from AI

    -- Status workflow: NEW -> FILTERED -> VALIDATED/DISCARDED/PUBLISHED
    status TEXT DEFAULT 'NEW',

    -- Raw data storage
    raw_content TEXT,                   -- Legacy JSON string of notification
    raw_notification JSONB,             -- Full Wachete notification as JSONB

    -- Before/after content for diff
    previous_text TEXT,                 -- "comparand" from Wachete
    current_text TEXT,                  -- "current" from Wachete
    diff_text TEXT,                     -- Computed unified diff

    -- Deduplication hash
    change_hash TEXT,                   -- SHA256(wachet_id|notification_id|prev|curr)

    -- AI-extracted metadata (from migration 001)
    headline VARCHAR(200),              -- Main idea in ~10 words
    source_name VARCHAR(200),           -- Institution name
    source_country VARCHAR(100),        -- Country of source

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_wachet_changes_status
    ON wachet_changes(status);

CREATE INDEX IF NOT EXISTS idx_wachet_changes_importance
    ON wachet_changes(importance);

CREATE INDEX IF NOT EXISTS idx_wachet_changes_created_at
    ON wachet_changes(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wachet_changes_source_country
    ON wachet_changes(source_country);

-- Deduplication indexes
CREATE INDEX IF NOT EXISTS idx_wachet_changes_hash
    ON wachet_changes(wachet_id, change_hash);

CREATE UNIQUE INDEX IF NOT EXISTS ux_wachet_changes_notification_id
    ON wachet_changes(wachete_notification_id)
    WHERE wachete_notification_id IS NOT NULL;

-- Comments
COMMENT ON TABLE wachet_changes IS 'Stores regulatory changes ingested from Wachete with AI classification';
COMMENT ON COLUMN wachet_changes.wachet_id IS 'Task ID from Wachete';
COMMENT ON COLUMN wachet_changes.wachete_notification_id IS 'Unique notification ID from Wachete';
COMMENT ON COLUMN wachet_changes.previous_text IS 'Previous version content (comparand from Wachete)';
COMMENT ON COLUMN wachet_changes.current_text IS 'Current version content from Wachete';
COMMENT ON COLUMN wachet_changes.diff_text IS 'Unified diff between previous and current';
COMMENT ON COLUMN wachet_changes.change_hash IS 'SHA256 hash for deduplication';
COMMENT ON COLUMN wachet_changes.headline IS 'AI-generated main idea in 10 words or less';
COMMENT ON COLUMN wachet_changes.source_name IS 'AI-identified institution or source name';
COMMENT ON COLUMN wachet_changes.source_country IS 'AI-identified country of the source';
