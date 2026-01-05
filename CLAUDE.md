# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

## Project Overview

**Asertiva Monitoring** is a regulatory change monitoring system that:
1) polls external sources (Wachete) for legal/regulatory updates,
2) stores raw change payloads in Postgres,
3) optionally classifies/filters changes using an AI service,
4) exposes REST endpoints via a FastAPI API,
5) displays a dashboard in a React + Vite frontend for review/validation.

### Final Goal (product behavior)
A user opens the dashboard and can:
- see a list of changes (latest first),
- filter by status/importance/country/source,
- open a detail panel with before/after text and diff,
- validate/discard/publish changes,
- (optional) see AI classification fields (importance, score, reason, headline, source metadata).

If the UI shows “no data”, the pipeline is not producing records (ingestor/worker not run) or the API can’t query the DB schema.

---

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **API**: FastAPI + SQLAlchemy
- **AI Filter**: FastAPI + OpenAI (optional for classification)
- **Database**: PostgreSQL 16
- **Workers**: Python scripts (ingestor, filter-worker)

---

## Ground Rules (IMPORTANT)

- Assume **nothing is running locally** outside Docker unless explicitly stated.
- Prefer **Docker Compose** for running the stack.
- When debugging connectivity, always verify **container ports** via `docker compose ps`.
- When the UI returns “Error al cargar datos”, treat it as: **frontend OK, API error (often 500) or DB schema mismatch**.

---

## Architecture

### Data Pipeline Flow
1. **Ingestor** (`services/ingestor`): Pulls Wachete changes, deduplicates, inserts into `wachet_changes` with status `NEW`.
2. **Filter Worker** (`services/filter-worker`): Picks `NEW` rows, calls AI Filter service, writes AI fields, sets status `FILTERED`.
3. **AI Filter** (`services/ai-filter`): Stateless classifier (IMPORTANT/NOT_IMPORTANT) + metadata.
4. **API** (`services/api`): Endpoints for the frontend (list, summary, status updates).
5. **Frontend** (`frontend`): Dashboard list, filters, and detail panel with diff view.

### Status Workflow
`NEW` -> `FILTERED` -> `VALIDATED` or `DISCARDED` or `PUBLISHED`

---

## Database

### Key Table: `wachet_changes`
This table stores all monitored changes. Some columns are optional depending on migrations.

**Required core columns (minimum for listing):**
- id (PK)
- created_at / updated_at
- url
- title
- status
- previous_text / current_text / diff_text (may be nullable but should exist)

**Optional columns (may be absent if migrations weren’t applied yet):**
- headline
- source_name
- source_country
- ai_score
- ai_reason
- importance
- raw_notification (JSONB)
- raw_content (TEXT/JSON string)

### Migrations
Run migrations against the running DB if schema mismatches cause API 500 errors.

```bash
psql "$DATABASE_URL" -f migrations/001_add_ai_institution_fields.sql
psql "$DATABASE_URL" -f migrations/002_add_wachete_diff_fields.sql
