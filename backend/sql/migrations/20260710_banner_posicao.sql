-- Posição do banner de capa no perfil (2026-07-10)
-- Adiciona banner_posicao em usuarios (ex.: "50% 30%" para object-position).
--
-- Idempotente: seguro em bancos parcialmente migrados (IF NOT EXISTS).
-- Não necessário em instalação nova via sql.sql.
--
-- Uso:
--   psql "$DATABASE_URL" -f backend/sql/migrations/20260710_banner_posicao.sql

ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS banner_posicao VARCHAR(32);
