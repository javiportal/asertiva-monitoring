-- Migration 005: Create WatchGuard scheduler configuration table
-- This table stores the scheduler state and configuration for WatchGuard polling

CREATE TABLE IF NOT EXISTS watchguard_scheduler_config (
    id SERIAL PRIMARY KEY,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    start_hour INTEGER NOT NULL DEFAULT 7 CHECK (start_hour >= 0 AND start_hour <= 23),
    end_hour INTEGER NOT NULL DEFAULT 17 CHECK (end_hour >= 0 AND end_hour <= 23),
    interval_hours INTEGER NOT NULL DEFAULT 3 CHECK (interval_hours >= 1 AND interval_hours <= 24),
    last_run TIMESTAMP WITH TIME ZONE,
    trigger_now BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_by TEXT
);

-- Insert default configuration row (only if table is empty)
INSERT INTO watchguard_scheduler_config (enabled, start_hour, end_hour, interval_hours)
SELECT TRUE, 7, 17, 3
WHERE NOT EXISTS (SELECT 1 FROM watchguard_scheduler_config);

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_watchguard_scheduler_enabled ON watchguard_scheduler_config(enabled);

COMMENT ON TABLE watchguard_scheduler_config IS 'Configuration for WatchGuard scheduler polling';
COMMENT ON COLUMN watchguard_scheduler_config.enabled IS 'Whether the scheduler is active';
COMMENT ON COLUMN watchguard_scheduler_config.start_hour IS 'Hour of day to start polling (0-23)';
COMMENT ON COLUMN watchguard_scheduler_config.end_hour IS 'Hour of day to stop polling (0-23)';
COMMENT ON COLUMN watchguard_scheduler_config.interval_hours IS 'Hours between polling runs';
COMMENT ON COLUMN watchguard_scheduler_config.last_run IS 'Timestamp of last successful run';
COMMENT ON COLUMN watchguard_scheduler_config.trigger_now IS 'Flag to trigger immediate run';
COMMENT ON COLUMN watchguard_scheduler_config.updated_by IS 'User or system that last updated config';
