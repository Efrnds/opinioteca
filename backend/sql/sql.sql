DROP TABLE IF EXISTS categorias CASCADE;

CREATE TABLE categorias (
    id SERIAL PRIMARY KEY,
    nome_categoria VARCHAR(255) NOT NULL UNIQUE,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS assinaturas CASCADE;

CREATE TABLE assinaturas (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(50) NOT NULL UNIQUE,
    nome VARCHAR(255) NOT NULL,
    nivel INTEGER NOT NULL UNIQUE,
    analise_sentimento BOOLEAN NOT NULL DEFAULT FALSE,
    modo_zen BOOLEAN NOT NULL DEFAULT FALSE,
    templates_enriquecidos BOOLEAN NOT NULL DEFAULT FALSE,
    preco_mensal DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    preco_anual DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO assinaturas (codigo, nome, nivel, analise_sentimento, modo_zen, templates_enriquecidos, preco_mensal, preco_anual) VALUES
('free',      'Gratuito',  1, FALSE, FALSE, FALSE,  0.00,   0.00),
('premium',   'OpinioTop',   2, FALSE, FALSE, TRUE,   9.99,  89.99),
('pro', 'OpinioPro', 3, TRUE,  TRUE,  TRUE,  19.99, 189.99);


DROP TABLE IF EXISTS templates CASCADE;

CREATE TABLE templates (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL UNIQUE,
    assinatura_minima_id INTEGER NOT NULL REFERENCES assinaturas(id),
    estrutura_json JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS usuarios CASCADE;

CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    rank_confiabilidade INTEGER NOT NULL DEFAULT 0,
    assinatura_id INTEGER NOT NULL DEFAULT 1 REFERENCES assinaturas(id),
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    sequencia_atual INTEGER NOT NULL DEFAULT 0,
    maior_sequencia INTEGER NOT NULL DEFAULT 0,
    modo_zen BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(255) NOT NULL CHECK (status IN ('ativo', 'inativo')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS livros CASCADE;

CREATE TABLE livros (
    id SERIAL PRIMARY KEY,
    ISBN VARCHAR(13) NOT NULL UNIQUE,
    titulo VARCHAR(255) NOT NULL,
    editora VARCHAR(255) NOT NULL,
    categoria_id INTEGER NOT NULL REFERENCES categorias(id),
    status VARCHAR(255) NOT NULL CHECK (status IN ('ativo', 'inativo')),
    paginas INTEGER NOT NULL,
    autor VARCHAR(255) NOT NULL,
    sinopse TEXT NOT NULL,
    capa_url VARCHAR(255) NOT NULL,
    data_publicacao DATE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS avaliacoes CASCADE;

CREATE TABLE avaliacoes (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    livro_id INTEGER NOT NULL REFERENCES livros(id),
    template_id INTEGER REFERENCES templates(id),
    nota INTEGER NOT NULL CHECK (nota >= 1 AND nota <= 5),
    texto TEXT NOT NULL,
    score_sentimento FLOAT DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (usuario_id, livro_id)
);

DROP TABLE IF EXISTS voto_avaliacoes CASCADE;

CREATE TABLE voto_avaliacoes (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    avaliacao_id INTEGER NOT NULL REFERENCES avaliacoes(id),
    tipo_voto VARCHAR(255) NOT NULL CHECK (tipo_voto IN ('upvote', 'downvote')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (usuario_id, avaliacao_id)
);

DROP TABLE IF EXISTS comentarios CASCADE;

CREATE TABLE comentarios (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    avaliacao_id INTEGER NOT NULL REFERENCES avaliacoes(id),
    texto TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS seguidores CASCADE;

CREATE TABLE seguidores (
    id_seguidor INTEGER NOT NULL REFERENCES usuarios(id),
    id_seguido INTEGER NOT NULL REFERENCES usuarios(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_seguidor, id_seguido),
    CHECK (id_seguidor <> id_seguido)
);

DROP TABLE IF EXISTS diario_leitura CASCADE;

CREATE TABLE diario_leitura (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    livro_id INTEGER NOT NULL REFERENCES livros(id),
    paginas_lidas INTEGER NOT NULL,
    porcentagem_leitura FLOAT NOT NULL,
    data_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS mensagens CASCADE;

CREATE TABLE mensagens (
    id SERIAL PRIMARY KEY,
    remetente_id INTEGER NOT NULL REFERENCES usuarios(id),
    destinatario_id INTEGER NOT NULL REFERENCES usuarios(id),
    conteudo TEXT NOT NULL,
    lida BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS notificacoes CASCADE;

CREATE TABLE notificacoes (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    tipo_notificacao VARCHAR(255) NOT NULL CHECK (tipo_notificacao IN ('avaliacao', 'comentario', 'seguidor', 'mensagem', 'voto_avaliacao')),
    titulo VARCHAR(255) NOT NULL,
    conteudo TEXT NOT NULL,
    referencia_id INTEGER DEFAULT NULL,
    lida BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS denuncias CASCADE;

CREATE TABLE denuncias (
    id SERIAL PRIMARY KEY,
    denunciante_id INTEGER NOT NULL REFERENCES usuarios(id),
    tipo_entidade VARCHAR(50) NOT NULL CHECK (tipo_entidade IN ('avaliacao', 'comentario', 'usuario', 'mensagem')),
    referencia_id INTEGER NOT NULL,
    motivo VARCHAR(50) NOT NULL CHECK (motivo IN ('spam', 'ofensivo', 'conteudo_inadequado', 'informacao_falsa', 'outro')),
    descricao TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_analise', 'resolvida', 'rejeitada')),
    admin_id INTEGER REFERENCES usuarios(id),
    resolucao TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolvida_em TIMESTAMP,
    UNIQUE (denunciante_id, tipo_entidade, referencia_id)
);