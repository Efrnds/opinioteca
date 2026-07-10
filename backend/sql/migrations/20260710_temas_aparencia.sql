-- Temas e aparência do usuário (2026-07-10)
-- Adiciona preferências de tema, cor de destaque e cores custom (OpinioPro).
--
-- Idempotente: seguro em bancos parcialmente migrados (IF NOT EXISTS).
-- Não necessário em instalação nova via sql.sql.
--
-- Uso:
--   psql "$DATABASE_URL" -f backend/sql/migrations/20260710_temas_aparencia.sql

ALTER TABLE usuario_configuracoes
    ADD COLUMN IF NOT EXISTS tema VARCHAR(20) NOT NULL DEFAULT 'claro';

ALTER TABLE usuario_configuracoes
    ADD COLUMN IF NOT EXISTS cor_destaque VARCHAR(32) NOT NULL DEFAULT 'azul';

ALTER TABLE usuario_configuracoes
    ADD COLUMN IF NOT EXISTS cor_fundo_texto VARCHAR(32);

ALTER TABLE usuario_configuracoes
    ADD COLUMN IF NOT EXISTS cor_superficie VARCHAR(32);

-- Garante CHECK apenas se ainda não existir (Postgres não tem IF NOT EXISTS para constraints nomeadas de forma portátil).
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'usuario_configuracoes_tema_check'
    ) THEN
        ALTER TABLE usuario_configuracoes
            ADD CONSTRAINT usuario_configuracoes_tema_check
            CHECK (tema IN ('claro', 'escuro', 'leitor', 'custom'));
    END IF;
END $$;
