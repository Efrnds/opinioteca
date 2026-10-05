-- Recuperação de senha por OTP (e-mail SMTP).
--
-- Uso:
--   psql "$DATABASE_URL" -f backend/sql/migrations/20261005_password_resets_otp.sql

CREATE TABLE IF NOT EXISTS password_resets (
    id BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    code_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ NULL,
    attempts INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_resets_usuario_ativo
    ON password_resets (usuario_id)
    WHERE used_at IS NULL;
