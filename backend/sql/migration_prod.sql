-- =============================================================================
-- Opinioteca — migração incremental para produção
-- =============================================================================
-- Idempotente: pode rodar mais de uma vez com segurança (IF NOT EXISTS).
-- Destinada a bancos criados com o schema antigo, antes das features recentes.
--
-- Uso:
--   psql "$DATABASE_URL" -f backend/sql/migration_prod.sql
--
-- Se ainda não rodou a migração de livros/Google Books, este arquivo já inclui
-- os passos equivalentes ao migration_livros_avaliacoes.sql.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Livros — Google Books e campos opcionais
-- -----------------------------------------------------------------------------
INSERT INTO categorias (nome_categoria)
VALUES ('Outros')
ON CONFLICT (nome_categoria) DO NOTHING;

ALTER TABLE livros ALTER COLUMN ISBN TYPE VARCHAR(20);
ALTER TABLE livros ALTER COLUMN ISBN DROP NOT NULL;

ALTER TABLE livros ALTER COLUMN editora DROP NOT NULL;
ALTER TABLE livros ALTER COLUMN sinopse DROP NOT NULL;
ALTER TABLE livros ALTER COLUMN capa_url TYPE VARCHAR(512);
ALTER TABLE livros ALTER COLUMN capa_url DROP NOT NULL;
ALTER TABLE livros ALTER COLUMN data_publicacao DROP NOT NULL;

ALTER TABLE livros ADD COLUMN IF NOT EXISTS google_volume_id VARCHAR(255);
ALTER TABLE livros ADD COLUMN IF NOT EXISTS origem VARCHAR(50) NOT NULL DEFAULT 'local';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'livros_origem_check'
    ) THEN
        ALTER TABLE livros ADD CONSTRAINT livros_origem_check
            CHECK (origem IN ('local', 'google_books', 'manual'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'livros_google_volume_id_key'
    ) THEN
        ALTER TABLE livros ADD CONSTRAINT livros_google_volume_id_key UNIQUE (google_volume_id);
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 2) Avaliações — spoiler e mídia (imagem/GIF na resenha)
-- -----------------------------------------------------------------------------
ALTER TABLE avaliacoes
    ADD COLUMN IF NOT EXISTS contem_spoiler BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE avaliacoes
    ADD COLUMN IF NOT EXISTS anexo_url VARCHAR(512);

-- -----------------------------------------------------------------------------
-- 3) Comentários — threads (respostas) e mídia
-- -----------------------------------------------------------------------------
ALTER TABLE comentarios
    ADD COLUMN IF NOT EXISTS pai_id INTEGER;

ALTER TABLE comentarios
    ADD COLUMN IF NOT EXISTS anexo_url VARCHAR(512);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'comentarios_pai_id_fkey'
    ) THEN
        ALTER TABLE comentarios
            ADD CONSTRAINT comentarios_pai_id_fkey
            FOREIGN KEY (pai_id) REFERENCES comentarios(id) ON DELETE CASCADE;
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 4) Votos em comentários
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS voto_comentarios (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    comentario_id INTEGER NOT NULL REFERENCES comentarios(id) ON DELETE CASCADE,
    tipo_voto VARCHAR(50) NOT NULL CHECK (tipo_voto IN ('upvote', 'downvote')),
    criadoEm TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (usuario_id, comentario_id)
);

-- -----------------------------------------------------------------------------
-- 5) Cache do comentário em destaque (feed / WebSocket)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS comentario_destaque_cache (
    avaliacao_id INTEGER PRIMARY KEY REFERENCES avaliacoes(id) ON DELETE CASCADE,
    comentario_id INTEGER REFERENCES comentarios(id) ON DELETE CASCADE,
    votos INTEGER NOT NULL DEFAULT 0,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 6) Mensagens — mídia, edição, respostas, reações e exclusão suave
-- -----------------------------------------------------------------------------
ALTER TABLE mensagens ADD COLUMN IF NOT EXISTS anexo_url VARCHAR(512);
ALTER TABLE mensagens ADD COLUMN IF NOT EXISTS editada BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE mensagens ADD COLUMN IF NOT EXISTS resposta_a_id INTEGER REFERENCES mensagens(id) ON DELETE SET NULL;
ALTER TABLE mensagens ADD COLUMN IF NOT EXISTS reacao VARCHAR(50);
ALTER TABLE mensagens ADD COLUMN IF NOT EXISTS apagado_por_remetente BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE mensagens ADD COLUMN IF NOT EXISTS apagado_por_destinatario BOOLEAN NOT NULL DEFAULT FALSE;

-- -----------------------------------------------------------------------------
-- 7) Conversas fixadas (chat)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS conversas_fixadas (
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    outro_usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    UNIQUE (usuario_id, outro_usuario_id)
);

-- -----------------------------------------------------------------------------
-- 8) Citações do feed (opcional — o backend também cria via startup)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS citacoes (
    id SERIAL PRIMARY KEY,
    texto TEXT NOT NULL,
    autor VARCHAR(100) NOT NULL
);

ALTER TABLE avaliacoes ADD COLUMN IF NOT EXISTS anexo_url VARCHAR(512);
ALTER TABLE avaliacoes ADD COLUMN IF NOT EXISTS contem_spoiler BOOLEAN NOT NULL DEFAULT FALSE;

-- -----------------------------------------------------------------------------
-- Fim da migração
-- =============================================================================

