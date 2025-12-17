# Migraciones recientes

## 002_add_wachete_diff_fields

- Objetivo: almacenar antes/después del contenido de Wachete y su diff.
- Columnas nuevas: `wachete_notification_id`, `previous_text`, `current_text`, `diff_text`, `raw_notification`.
- Ejecución local:

```bash
psql "$DATABASE_URL" -f migrations/002_add_wachete_diff_fields.sql
```

- Endpoint para validar desde el frontend/API: `GET /wachet-changes` (incluye `previous_text`, `current_text`, `diff_text`).
