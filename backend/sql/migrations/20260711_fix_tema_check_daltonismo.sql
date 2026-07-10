-- Corrige CHECK de tema para incluir 'daltonismo'
-- (migrations anteriores de tema_custom/temas_aparencia omitiram o valor).
--
-- Uso:
--   psql "$DATABASE_URL" -f backend/sql/migrations/20260711_fix_tema_check_daltonismo.sql

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
