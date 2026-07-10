-- Cor do texto custom (OpinioPro) (2026-07-10)
-- Adiciona cor_texto em usuario_configuracoes.
--
-- Idempotente: seguro em bancos parcialmente migrados (IF NOT EXISTS).
-- Não necessário em instalação nova via sql.sql.
--
-- Uso:
--   psql "$DATABASE_URL" -f backend/sql/migrations/20260710_cor_texto.sql

ALTER TABLE usuario_configuracoes
    ADD COLUMN IF NOT EXISTS cor_texto VARCHAR(32);
