# WatchGuard Integration Guide

This document describes the changes made to prepare RiskMonitor for accepting changes from WatchGuard (and other external sources) without creating a parallel system.

## Summary of Changes

### 1. Database Migration (`migrations/004_add_watchguard_fields.sql`)

New columns added to `wachet_changes`:
- `source` (VARCHAR 50, default 'wachete') - Origin: wachete/watchguard/manual
- `content_hash` (VARCHAR 64, nullable) - SHA256 of normalized text for deduplication
- `fetch_mode` (VARCHAR 20, nullable) - Content retrieval method: http/browser/pdf
- `snapshot_ref` (TEXT, nullable) - External snapshot storage reference
- `fetched_at` (TIMESTAMPTZ, nullable) - When content was fetched

New indexes:
- `idx_wachet_changes_source` - Filter by source
- `idx_wachet_changes_content_hash` - Partial index on content_hash
- `ux_wachet_changes_url_hash_day` - Unique constraint for deduplication

### 2. API Updates (`services/api/app/main.py`)

- Updated `WachetChangeItem` Pydantic model with new fields
- Added `INGEST_API_TOKEN` environment variable for API authentication
- New endpoint: `POST /ingest/changes`

### 3. New Ingestion Endpoint

**Endpoint:** `POST /ingest/changes`

**Authentication:** Requires `X-Ingest-Token` header (unless `INGEST_API_TOKEN` env var is empty)

**Request Body (ChangeIngestV1):**
```json
{
  "source": "watchguard",
  "wachet_id": "optional-custom-id",
  "url": "https://example.com/page",
  "title": "Page Title",
  "previous_text": "Old content...",
  "current_text": "New content...",
  "diff_text": "Optional pre-computed diff",
  "content_hash": "sha256-hash-of-normalized-text",
  "fetch_mode": "http",
  "fetched_at": "2025-01-01T12:00:00Z",
  "snapshot_ref": "s3://bucket/key",
  "raw_notification": {}
}
```

**Response (ChangeIngestResponse):**
```json
{
  "ok": true,
  "id": 123,
  "wachet_id": "watchguard:abc123:1704110400",
  "message": "Change ingested successfully",
  "duplicate": false
}
```

**Deduplication Logic:**
- If `content_hash` and `url` are provided, checks for existing record with same values in last 24h
- Returns `duplicate: true` if found (200 OK, no new insert)
- Unique DB constraint prevents same URL + hash on same calendar day

### 4. Frontend Updates

- Added source badges to ChangesTable and DetailPanel
- Visual indicators: Wachete (blue/globe), WatchGuard (purple/shield), Manual (green/edit)
- AlertRegistrationModal now prefills `topic` from `change.headline`

### 5. Filter Worker Compatibility

The filter-worker already processes ALL changes with `status='NEW'` regardless of source.
No changes needed - WatchGuard changes will automatically flow through the AI classification pipeline.

---

## Verification Checklist

### Prerequisites

1. Start the Docker Compose stack:
   ```bash
   docker compose up -d
   ```

2. Run the migration:
   ```bash
   docker compose exec postgres psql -U postgres -d asertiva -f /migrations/004_add_watchguard_fields.sql
   # OR
   psql "$DATABASE_URL" -f migrations/004_add_watchguard_fields.sql
   ```

### Database Verification

```sql
-- Verify new columns exist
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'wachet_changes'
  AND column_name IN ('source', 'content_hash', 'fetch_mode', 'snapshot_ref', 'fetched_at');

-- Verify indexes exist
SELECT indexname FROM pg_indexes
WHERE tablename = 'wachet_changes'
  AND indexname IN ('idx_wachet_changes_source', 'idx_wachet_changes_content_hash', 'ux_wachet_changes_url_hash_day');

-- Check backfill (all existing rows should have source='wachete')
SELECT source, COUNT(*) FROM wachet_changes GROUP BY source;
```

### API Verification

1. **Test ingestion endpoint (without auth - dev mode):**
   ```bash
   curl -X POST http://localhost:8000/ingest/changes \
     -H "Content-Type: application/json" \
     -d '{
       "source": "watchguard",
       "url": "https://example.com/test-page",
       "title": "Test WatchGuard Change",
       "previous_text": "Old content here",
       "current_text": "New content with changes",
       "content_hash": "abc123def456",
       "fetch_mode": "http"
     }'
   ```

   Expected response:
   ```json
   {
     "ok": true,
     "id": <new_id>,
     "wachet_id": "watchguard:<hash>:<timestamp>",
     "message": "Change ingested successfully",
     "duplicate": false
   }
   ```

2. **Test deduplication (run same request again):**
   ```bash
   # Same curl command as above
   ```

   Expected response:
   ```json
   {
     "ok": true,
     "id": <existing_id>,
     "wachet_id": "watchguard:<original_id>",
     "message": "Change already exists (duplicate within 24h window)",
     "duplicate": true
   }
   ```

3. **Test with auth enabled:**
   ```bash
   # Set env var in docker-compose.yml or .env:
   # INGEST_API_TOKEN=your-secret-token

   curl -X POST http://localhost:8000/ingest/changes \
     -H "Content-Type: application/json" \
     -H "X-Ingest-Token: your-secret-token" \
     -d '{"source": "watchguard", "url": "...", "title": "..."}'
   ```

4. **Verify new change appears in list:**
   ```bash
   curl http://localhost:8000/wachet-changes | jq '.items[] | select(.source == "watchguard")'
   ```

### Frontend Verification

1. Open the dashboard at http://localhost:5173
2. Look for the source badge in the changes table (should show "Wachete" for existing, "WatchGuard" for new)
3. Click on a change to open the detail panel and verify source badge appears
4. Click the bell icon to open AlertRegistrationModal and verify:
   - Country is prefilled from `source_country`
   - Topic is prefilled from `headline` (if available)

### Filter Worker Verification

1. Ingest a new change via the API
2. Run the filter worker:
   ```bash
   docker compose exec filter-worker python -m app.main
   ```
3. Verify the change status changed from `NEW` to `FILTERED`
4. Check that AI fields are populated (importance, ai_score, ai_reason)

---

## WatchGuard Integration (Next Steps)

Once RiskMonitor is prepared (this PR), the WatchGuard service should:

1. Call `POST /ingest/changes` with:
   - `source: "watchguard"`
   - `url`: The monitored page URL
   - `title`: Page title or monitor name
   - `previous_text` / `current_text`: Extracted text content
   - `content_hash`: SHA256 of normalized current_text for deduplication
   - `fetch_mode`: "http", "browser", or "pdf"
   - `fetched_at`: Timestamp when content was fetched

2. Handle the response:
   - If `duplicate: true`, skip processing (change already exists)
   - If `ok: true` and `duplicate: false`, change was successfully ingested

3. Set the `X-Ingest-Token` header with the configured secret

The ingested changes will automatically:
- Appear in the dashboard with the WatchGuard badge
- Be processed by the AI filter worker
- Follow the same validation workflow as Wachete changes
