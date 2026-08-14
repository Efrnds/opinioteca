-- Login com Google: vincula contas ao subject OAuth (sub).
ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS google_id VARCHAR(255);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'usuarios_google_id_key'
    ) THEN
        ALTER TABLE usuarios ADD CONSTRAINT usuarios_google_id_key UNIQUE (google_id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_usuarios_google_id ON usuarios (google_id)
    WHERE google_id IS NOT NULL;
