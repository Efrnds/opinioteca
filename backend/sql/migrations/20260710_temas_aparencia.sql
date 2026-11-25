

ALTER TABLE usuario_configuracoes
    ADD COLUMN IF NOT EXISTS tema VARCHAR(20) NOT NULL DEFAULT 'claro';

ALTER TABLE usuario_configuracoes
    ADD COLUMN IF NOT EXISTS cor_destaque VARCHAR(32) NOT NULL DEFAULT 'azul';

ALTER TABLE usuario_configuracoes
    ADD COLUMN IF NOT EXISTS cor_fundo_texto VARCHAR(32);

ALTER TABLE usuario_configuracoes
    ADD COLUMN IF NOT EXISTS cor_superficie VARCHAR(32);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'usuario_configuracoes_tema_check'
    ) THEN
        ALTER TABLE usuario_configuracoes
            ADD CONSTRAINT usuario_configuracoes_tema_check
            CHECK (tema IN ('claro', 'escuro', 'leitor', 'custom', 'daltonismo'));
    END IF;
END $$;
