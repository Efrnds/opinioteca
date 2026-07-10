-- Acessibilidade: tema para daltonismo e tipo selecionável por usuário.
-- Uso:
--   psql "$DATABASE_URL" -f backend/sql/migrations/20260710_acessibilidade_daltonismo.sql

ALTER TABLE usuario_configuracoes
    ADD COLUMN IF NOT EXISTS daltonismo_tipo VARCHAR(20) NOT NULL DEFAULT 'deuteranopia';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'usuario_configuracoes_daltonismo_tipo_check'
    ) THEN
        ALTER TABLE usuario_configuracoes
            ADD CONSTRAINT usuario_configuracoes_daltonismo_tipo_check
            CHECK (daltonismo_tipo IN ('protanopia', 'deuteranopia', 'tritanopia', 'acromatopsia'));
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'usuario_configuracoes_tema_check'
    ) THEN
        ALTER TABLE usuario_configuracoes
            DROP CONSTRAINT usuario_configuracoes_tema_check;
    END IF;

    ALTER TABLE usuario_configuracoes
        ADD CONSTRAINT usuario_configuracoes_tema_check
        CHECK (tema IN ('claro', 'escuro', 'leitor', 'custom', 'daltonismo'));
END $$;
