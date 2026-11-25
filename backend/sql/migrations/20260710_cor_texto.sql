

ALTER TABLE usuario_configuracoes
    ADD COLUMN IF NOT EXISTS cor_texto VARCHAR(32);
