-- Migração: múltiplas categorias por livro (tabela de junção)
-- Mantém livros.categoria_id como categoria primária (legado / exibição).

CREATE TABLE IF NOT EXISTS livro_categorias (
    livro_id INTEGER NOT NULL REFERENCES livros(id) ON DELETE CASCADE,
    categoria_id INTEGER NOT NULL REFERENCES categorias(id) ON DELETE CASCADE,
    PRIMARY KEY (livro_id, categoria_id)
);

CREATE INDEX IF NOT EXISTS idx_livro_categorias_categoria_id ON livro_categorias(categoria_id);

INSERT INTO livro_categorias (livro_id, categoria_id)
SELECT id, categoria_id FROM livros
WHERE categoria_id IS NOT NULL
ON CONFLICT DO NOTHING;
