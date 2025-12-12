-- Migration: Add AI-extracted fields for institution identification
-- Run this on your PostgreSQL database

ALTER TABLE wachet_changes 
ADD COLUMN IF NOT EXISTS headline VARCHAR(200) DEFAULT NULL;

ALTER TABLE wachet_changes 
ADD COLUMN IF NOT EXISTS source_name VARCHAR(200) DEFAULT NULL;

ALTER TABLE wachet_changes 
ADD COLUMN IF NOT EXISTS source_country VARCHAR(100) DEFAULT NULL;

-- Create index for filtering by country
CREATE INDEX IF NOT EXISTS idx_wachet_changes_source_country 
ON wachet_changes (source_country);

COMMENT ON COLUMN wachet_changes.headline IS 'AI-generated main idea in 10 words or less';
COMMENT ON COLUMN wachet_changes.source_name IS 'AI-identified institution or source name';
COMMENT ON COLUMN wachet_changes.source_country IS 'AI-identified country of the source';
