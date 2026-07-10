-- Tema custom + cor_hover (2026-07-10)
-- Adiciona modo 'custom', cor_hover e migra quem já tinha cores personalizadas.
--
-- Idempotente: seguro em bancos parcialmente migrados.
--
-- Uso:
--   psql "$DATABASE_URL" -f backend/sql/migrations/20260710_tema_custom.sql

ALTER TABLE usuario_configuracoes
    ADD COLUMN IF NOT EXISTS cor_texto VARCHAR(32);

ALTER TABLE usuario_configuracoes
    ADD COLUMN IF NOT EXISTS cor_hover VARCHAR(32);

-- Atualiza CHECK do tema para incluir 'custom'.
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
        CHECK (tema IN ('claro', 'escuro', 'leitor', 'custom'));
END $$;

-- Quem já tinha pack custom sob claro/escuro/leitor passa a tema custom
-- (antes as cores custom venciam a paleta mesmo com outro tema selecionado).
UPDATE usuario_configuracoes
SET tema = 'custom'
WHERE tema IN ('claro', 'escuro', 'leitor')
  AND (
      cor_fundo_texto IS NOT NULL
      OR cor_superficie IS NOT NULL
      OR cor_texto IS NOT NULL
      OR cor_hover IS NOT NULL
      OR cor_destaque ~ '^#'
  );
