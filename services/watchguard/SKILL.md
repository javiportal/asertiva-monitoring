# WatchGuard Service

## Overview

WatchGuard is a custom web monitoring service that handles sources where Wachete fails:
- Dynamic JS-heavy sites
- Anti-bot protected pages
- PDF documents
- Noisy HTML that needs custom extraction

## Quick Start

```bash
# Run one-shot fetch for all configured URLs
python -m watchguard.cli run

# Fetch a single URL (for testing)
python -m watchguard.cli fetch https://example.com

# Check status of all monitored URLs
python -m watchguard.cli status
```

## Configuration

Edit `config/sites.yaml` to add URLs to monitor:

```yaml
sites:
  - url: https://dof.gob.mx/nota_detalle.php?codigo=5712345
    name: DOF - Reglas SAT
    fetch_mode: http          # http | browser | pdf
    content_selector: null    # CSS selector for content (optional)
    source_name: DOF
    source_country: México
```

## Architecture

```
URL → Fetcher → Extractor → Normalizer → Differ → IngestClient
                                ↓
                         Local Storage
                        (SQLite snapshots)
```

## Data Flow

1. **Fetcher**: Downloads page content (HTTP, Playwright, or PDF)
2. **Extractor**: Converts HTML/PDF to clean text
3. **Normalizer**: Removes noise, computes content hash
4. **Storage**: Saves snapshot, compares with previous
5. **Differ**: If changed, generates unified diff
6. **IngestClient**: POSTs to RiskMonitor `/ingest/changes`

## Environment Variables

```bash
WATCHGUARD_API_URL=http://localhost:8000  # RiskMonitor API
WATCHGUARD_DB_PATH=./data/watchguard.db   # Local SQLite
WATCHGUARD_LOG_LEVEL=INFO
```

## MVP Phases

- [x] Phase 1: HTTP fetcher + text extraction + hash comparison
- [ ] Phase 2: Playwright for JS-heavy sites
- [ ] Phase 3: PDF extraction
- [ ] Phase 4: Scheduler (every 3 hours)