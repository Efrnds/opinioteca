

ALTER TABLE usuario_configuracoes
    ADD COLUMN IF NOT EXISTS cor_texto VARCHAR(32);

ALTER TABLE usuario_configuracoes
    ADD COLUMN IF NOT EXISTS cor_hover VARCHAR(32);

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
