DROP TABLE IF EXISTS usuarios CASCADE;

CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    rank_confiabilidade INTEGER NOT NULL DEFAULT 0,
    nivel_assinatura VARCHAR(255) NOT NULL CHECK (nivel_assinatura IN ('free', 'premium', 'pro')),
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(255) NOT NULL CHECK (status IN ('ativo', 'inativo')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
)

DROP TABLE IF EXISTS livros CASCADE;

CREATE TABLE livros (
    id SERIAL PRIMARY KEY,
    ISBN BIGINT NOT NULL UNIQUE,
    titulo VARCHAR(255) NOT NULL,
    editora VARCHAR(255) NOT NULL,
    categoria_id INTEGER NOT NULL,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id),
    status VARCHAR(255) NOT NULL CHECK (status IN ('ativo', 'inativo')),
    paginas INTEGER NOT NULL,
    autor VARCHAR(255) NOT NULL,
    sinopse TEXT NOT NULL,
    capa_url VARCHAR(255) NOT NULL,
    data_publicacao INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
)

DROP TABLE IF EXISTS categorias CASCADE;

CREATE TABLE categorias (
    id SERIAL PRIMARY KEY,
    nome_categoria VARCHAR(255) NOT NULL UNIQUE,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
)

DROP TABLE IF EXISTS avaliacoes CASCADE;

CREATE TABLE avaliacoes (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    livro_id INTEGER NOT NULL,
    FOREIGN KEY (livro_id) REFERENCES livros(id),
    template_id INTEGER NOT NULL,
    FOREIGN KEY (template_id) REFERENCES templates(id),
    nota INTEGER NOT NULL CHECK (nota >= 1 AND nota <= 5),
    texto TEXT NOT NULL,
    score_sentimento FLOAT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
)

DROP TABLE IF EXISTS voto_avaliacoes CASCADE;

CREATE TABLE voto_avaliacoes (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    avaliacao_id INTEGER NOT NULL,
    FOREIGN KEY (avaliacao_id) REFERENCES avaliacoes(id),
    tipo_voto VARCHAR(255) NOT NULL CHECK (tipo_voto IN ('upvote', 'downvote')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
)

DROP TABLE IF EXISTS comentarios CASCADE;

CREATE TABLE comentarios (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    avaliacao_id INTEGER NOT NULL,
    FOREIGN KEY (avaliacao_id) REFERENCES avaliacoes(id),
    texto TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
)

DROP TABLE IF EXISTS seguidores CASCADE;

CREATE TABLE seguidores (
    id_seguidor INTEGER NOT NULL,
    FOREIGN KEY (id_seguidor) REFERENCES usuarios(id),
    id_seguido INTEGER NOT NULL,
    FOREIGN KEY (id_seguido) REFERENCES usuarios(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    PRIMARY KEY (id_seguidor, id_seguido)
)

DROP TABLE IF EXISTS diario_leitura CASCADE;

CREATE TABLE diario_leitura (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    livro_id INTEGER NOT NULL,
    FOREIGN KEY (livro_id) REFERENCES livros(id),
    paginas_lidas INTEGER NOT NULL,
    sequencia_atual INTEGER NOT NULL,
    maior_sequencia INTEGER NOT NULL,
    porcentagem_leitura FLOAT NOT NULL,
    data_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
)

DROP TABLE IF EXISTS mensagens CASCADE;

CREATE TABLE mensagens (
    id SERIAL PRIMARY KEY,
    remetente_id INTEGER NOT NULL,
    FOREIGN KEY (remetente_id) REFERENCES usuarios(id),
    destinatario_id INTEGER NOT NULL,
    FOREIGN KEY (destinatario_id) REFERENCES usuarios(id),
    conteudo TEXT NOT NULL,
    lida BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
)

DROP TABLE IF EXISTS notificacoes CASCADE;

CREATE TABLE notificacoes (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    tipo_notificacao VARCHAR(255) NOT NULL CHECK (tipo_notificacao IN ('avaliacao', 'comentario', 'seguidor', 'compartilhamento', 'mensagem', 'voto_avaliacao')),
    titulo VARCHAR(255) NOT NULL,
    conteudo TEXT NOT NULL,
    lida BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
)

DROP TABLE IF EXISTS templates CASCADE;

CREATE TABLE templates (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL UNIQUE,
    tipo_assinatura_minima VARCHAR(255) NOT NULL CHECK (tipo_assinatura_minima IN ('free', 'premium', 'pro')),
    estrutura_json JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
)
