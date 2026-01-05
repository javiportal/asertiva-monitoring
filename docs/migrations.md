# Migraciones

## Orden de ejecución

Para una instalación nueva, ejecutar en orden:

```bash
psql "$DATABASE_URL" -f migrations/000_init_wachet_changes.sql
psql "$DATABASE_URL" -f migrations/001_add_ai_institution_fields.sql
psql "$DATABASE_URL" -f migrations/002_add_wachete_diff_fields.sql
```

Para instalaciones existentes, solo ejecutar las migraciones faltantes.

---

## 000_init_wachet_changes (Base)

- **Objetivo**: Crear la tabla `wachet_changes` con todos los campos necesarios.
- **Columnas**: `id`, `wachet_id`, `wachete_notification_id`, `url`, `title`, `importance`, `ai_score`, `ai_reason`, `status`, `raw_content`, `raw_notification`, `previous_text`, `current_text`, `diff_text`, `change_hash`, `headline`, `source_name`, `source_country`, `created_at`, `updated_at`.
- **Indices**: Por `status`, `importance`, `created_at`, `source_country`, deduplicación por `change_hash` y `notification_id`.

```bash
psql "$DATABASE_URL" -f migrations/000_init_wachet_changes.sql
```

---

## 001_add_ai_institution_fields

- **Objetivo**: Agregar campos para metadatos extraídos por IA.
- **Columnas nuevas**: `headline`, `source_name`, `source_country`.

```bash
psql "$DATABASE_URL" -f migrations/001_add_ai_institution_fields.sql
```

---

## 002_add_wachete_diff_fields

- **Objetivo**: Almacenar antes/después del contenido de Wachete y su diff.
- **Columnas nuevas**: `wachete_notification_id`, `previous_text`, `current_text`, `diff_text`, `raw_notification`.

```bash
psql "$DATABASE_URL" -f migrations/002_add_wachete_diff_fields.sql
```

- **Validación**: `GET /wachet-changes` debe incluir `previous_text`, `current_text`, `diff_text`.
