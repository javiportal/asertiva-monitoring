-- Migration 004: Add WatchGuard support fields to wachet_changes
-- Run with: psql "$DATABASE_URL" -f migrations/004_add_watchguard_fields.sql
--
-- Purpose: Enables wachet_changes table to store changes from multiple sources
-- (wachete, watchguard, manual) using a unified schema.

-- 1. Add source column to distinguish change origin
ALTER TABLE wachet_changes
ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'wachete';

COMMENT ON COLUMN wachet_changes.source IS 'Origin of the change: wachete, watchguard, or manual';

-- 2. Add content_hash for normalized text deduplication
ALTER TABLE wachet_changes
ADD COLUMN IF NOT EXISTS content_hash VARCHAR(64) NULL;

COMMENT ON COLUMN wachet_changes.content_hash IS 'SHA256 hash of normalized extracted text for deduplication';

-- 3. Add fetch_mode to indicate how content was retrieved
ALTER TABLE wachet_changes
ADD COLUMN IF NOT EXISTS fetch_mode VARCHAR(20) NULL;

COMMENT ON COLUMN wachet_changes.fetch_mode IS 'Content retrieval method: http, browser, or pdf';

-- 4. Add snapshot_ref for external snapshot storage reference
ALTER TABLE wachet_changes
ADD COLUMN IF NOT EXISTS snapshot_ref TEXT NULL;

COMMENT ON COLUMN wachet_changes.snapshot_ref IS 'Reference to external snapshot storage (S3 key, file path, etc.)';

-- 5. Add fetched_at timestamp for when content was actually fetched
ALTER TABLE wachet_changes
ADD COLUMN IF NOT EXISTS fetched_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN wachet_changes.fetched_at IS 'Timestamp when the content was fetched from the source';

-- ============================================================
-- INDEXES
-- ============================================================

-- Index on source for filtering by origin
CREATE INDEX IF NOT EXISTS idx_wachet_changes_source
ON wachet_changes (source);

-- Partial index on content_hash for fast lookups (only non-null values)
CREATE INDEX IF NOT EXISTS idx_wachet_changes_content_hash
ON wachet_changes (content_hash)
WHERE content_hash IS NOT NULL;

-- Unique partial index for deduplication: same URL + content_hash on same day
-- This prevents duplicate ingestion of the same change
CREATE UNIQUE INDEX IF NOT EXISTS ux_wachet_changes_url_hash_day
ON wachet_changes (url, content_hash, DATE(created_at))
WHERE content_hash IS NOT NULL AND url IS NOT NULL;

-- ============================================================
-- BACKFILL: Set source='wachete' for existing rows where null
-- ============================================================

UPDATE wachet_changes
SET source = 'wachete'
WHERE source IS NULL;

-- ============================================================
-- Verification queries (run manually to confirm migration success):
-- ============================================================
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'wachet_changes'
--   AND column_name IN ('source', 'content_hash', 'fetch_mode', 'snapshot_ref', 'fetched_at');
--
-- SELECT COUNT(*) as total,
--        COUNT(CASE WHEN source = 'wachete' THEN 1 END) as wachete_rows,
--        COUNT(CASE WHEN source IS NULL THEN 1 END) as null_source
-- FROM wachet_changes;
