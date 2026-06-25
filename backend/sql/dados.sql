INSERT INTO categorias (nome_categoria) VALUES ('Outros')
ON CONFLICT (nome_categoria) DO NOTHING;

-- Bancos já existentes: rode backend/sql/migration_prod.sql
