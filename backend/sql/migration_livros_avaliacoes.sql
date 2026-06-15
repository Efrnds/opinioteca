-- Migração: livros com Google Books + seed categoria Outros
-- Executar em banco existente antes de subir a nova versão da API.

INSERT INTO categorias (nome_categoria) VALUES ('Outros')
ON CONFLICT (nome_categoria) DO NOTHING;

ALTER TABLE livros ALTER COLUMN ISBN TYPE VARCHAR(20);
ALTER TABLE livros ALTER COLUMN ISBN DROP NOT NULL;

ALTER TABLE livros ALTER COLUMN editora DROP NOT NULL;
ALTER TABLE livros ALTER COLUMN sinopse DROP NOT NULL;
ALTER TABLE livros ALTER COLUMN capa_url TYPE VARCHAR(512);
ALTER TABLE livros ALTER COLUMN capa_url DROP NOT NULL;
ALTER TABLE livros ALTER COLUMN data_publicacao DROP NOT NULL;

ALTER TABLE livros ADD COLUMN IF NOT EXISTS google_volume_id VARCHAR(255) UNIQUE;
ALTER TABLE livros ADD COLUMN IF NOT EXISTS origem VARCHAR(50) NOT NULL DEFAULT 'local';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'livros_origem_check'
    ) THEN
        ALTER TABLE livros ADD CONSTRAINT livros_origem_check
            CHECK (origem IN ('local', 'google_books', 'manual'));
    END IF;
END $$;
