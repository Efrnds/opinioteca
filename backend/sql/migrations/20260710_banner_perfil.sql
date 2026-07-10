-- Banner de capa no perfil do usuário (2026-07-10)
-- Adiciona banner_url em usuarios para imagem de capa (landscape).
--
-- Idempotente: seguro em bancos parcialmente migrados (IF NOT EXISTS).
-- Não necessário em instalação nova via sql.sql.
--
-- Uso:
--   psql "$DATABASE_URL" -f backend/sql/migrations/20260710_banner_perfil.sql

ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS banner_url VARCHAR(512);
