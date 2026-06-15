INSERT INTO categorias (nome_categoria) VALUES ('Outros')
ON CONFLICT (nome_categoria) DO NOTHING;
