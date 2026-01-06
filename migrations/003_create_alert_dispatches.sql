CREATE TABLE IF NOT EXISTS alert_dispatches (
    id SERIAL PRIMARY KEY,
    change_id INTEGER REFERENCES wachet_changes(id),
    email TEXT NOT NULL,
    dispatch_date DATE NOT NULL DEFAULT CURRENT_DATE,
    country_state TEXT NOT NULL, -- pais_estado
    alert_count INTEGER NOT NULL DEFAULT 1, -- numero_alertas
    alert_type TEXT NOT NULL, -- tipo_alerta (Regulatoria | Informativa)
    subject TEXT NOT NULL, -- materia
    topic TEXT NOT NULL, -- ambito_tema
    instance TEXT NOT NULL, -- instancia
    legislative_body TEXT, -- corporacion_legislativa (optional)
    clients TEXT, -- clientes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alert_dispatches_change_id ON alert_dispatches(change_id);
CREATE INDEX IF NOT EXISTS idx_alert_dispatches_date ON alert_dispatches(dispatch_date);
