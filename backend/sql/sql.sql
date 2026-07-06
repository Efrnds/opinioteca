    DROP TABLE IF EXISTS categorias CASCADE;

    CREATE TABLE categorias (
        id SERIAL PRIMARY KEY,
        nome_categoria VARCHAR(255) NOT NULL UNIQUE,
        ativo BOOLEAN NOT NULL DEFAULT TRUE,
        criadoEm TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
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
        criadoEm TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
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
        criadoEm TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    DROP TABLE IF EXISTS usuarios CASCADE;

    CREATE TABLE usuarios (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        nick VARCHAR(50) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        senha VARCHAR(255) NOT NULL,
        rank_confiabilidade INTEGER NOT NULL DEFAULT 0,
        assinatura_id INTEGER NOT NULL DEFAULT 1 REFERENCES assinaturas(id),
        is_admin BOOLEAN NOT NULL DEFAULT FALSE,
        sequencia_atual INTEGER NOT NULL DEFAULT 0,
        maior_sequencia INTEGER NOT NULL DEFAULT 0,
        modo_zen BOOLEAN NOT NULL DEFAULT FALSE,
        status VARCHAR(255) NOT NULL CHECK (status IN ('ativo', 'inativo')),
        image_url VARCHAR(512),
        criadoEm TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    DROP TABLE IF EXISTS livros CASCADE;

    CREATE TABLE livros (
        id SERIAL PRIMARY KEY,
        ISBN VARCHAR(20) UNIQUE,
        titulo VARCHAR(255) NOT NULL,
        editora VARCHAR(255),
        categoria_id INTEGER NOT NULL REFERENCES categorias(id),
        status VARCHAR(255) NOT NULL CHECK (status IN ('ativo', 'inativo')),
        paginas INTEGER NOT NULL,
        autor VARCHAR(255) NOT NULL,
        sinopse TEXT,
        capa_url VARCHAR(512),
        data_publicacao DATE,
        google_volume_id VARCHAR(255) UNIQUE,
        origem VARCHAR(50) NOT NULL DEFAULT 'local' CHECK (origem IN ('local', 'google_books', 'manual')),
        criadoEm TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    DROP TABLE IF EXISTS livro_categorias CASCADE;

    CREATE TABLE livro_categorias (
        livro_id INTEGER NOT NULL REFERENCES livros(id) ON DELETE CASCADE,
        categoria_id INTEGER NOT NULL REFERENCES categorias(id) ON DELETE CASCADE,
        PRIMARY KEY (livro_id, categoria_id)
    );

    CREATE INDEX idx_livro_categorias_categoria_id ON livro_categorias(categoria_id);

    DROP TABLE IF EXISTS avaliacoes CASCADE;

    CREATE TABLE avaliacoes (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
        livro_id INTEGER NOT NULL REFERENCES livros(id),
        template_id INTEGER REFERENCES templates(id),
        nota INTEGER NOT NULL CHECK (nota >= 1 AND nota <= 5),
        texto TEXT NOT NULL,
        contem_spoiler BOOLEAN NOT NULL DEFAULT FALSE,
        anexo_url VARCHAR(512),
        score_sentimento FLOAT DEFAULT NULL,
        criadoEm TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (usuario_id, livro_id)
    );

    DROP TABLE IF EXISTS voto_avaliacoes CASCADE;

    CREATE TABLE voto_avaliacoes (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
        avaliacao_id INTEGER NOT NULL REFERENCES avaliacoes(id) ON DELETE CASCADE,
        tipo_voto VARCHAR(255) NOT NULL CHECK (tipo_voto IN ('upvote', 'downvote')),
        criadoEm TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (usuario_id, avaliacao_id)
    );

    DROP TABLE IF EXISTS comentarios CASCADE;

    CREATE TABLE comentarios (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
        avaliacao_id INTEGER NOT NULL REFERENCES avaliacoes(id) ON DELETE CASCADE,
        pai_id INTEGER REFERENCES comentarios(id) ON DELETE CASCADE,
        texto TEXT NOT NULL,
        anexo_url VARCHAR(512),
        criadoEm TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    DROP TABLE IF EXISTS voto_comentarios CASCADE;

    CREATE TABLE voto_comentarios (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        comentario_id INTEGER NOT NULL REFERENCES comentarios(id) ON DELETE CASCADE,
        tipo_voto VARCHAR(50) NOT NULL CHECK (tipo_voto IN ('upvote', 'downvote')),
        criadoEm TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (usuario_id, comentario_id)
    );

    DROP TABLE IF EXISTS seguidores CASCADE;

    CREATE TABLE seguidores (
        id_seguidor INTEGER NOT NULL REFERENCES usuarios(id),
        id_seguido INTEGER NOT NULL REFERENCES usuarios(id),
        criadoEm TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
        anexo_url VARCHAR(512),
        lida BOOLEAN NOT NULL DEFAULT FALSE,
        editada BOOLEAN NOT NULL DEFAULT FALSE,
        resposta_a_id INTEGER REFERENCES mensagens(id) ON DELETE SET NULL,
        reacao VARCHAR(50),
        apagado_por_remetente BOOLEAN NOT NULL DEFAULT FALSE,
        apagado_por_destinatario BOOLEAN NOT NULL DEFAULT FALSE,
        criadoEm TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE conversas_fixadas (
        usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        outro_usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        UNIQUE(usuario_id, outro_usuario_id)
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
        criadoEm TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
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
        criadoEm TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        resolvida_em TIMESTAMP,
        UNIQUE (denunciante_id, tipo_entidade, referencia_id)
    );

    DROP TABLE IF EXISTS citacoes CASCADE;

    CREATE TABLE citacoes (
        id SERIAL PRIMARY KEY,
        texto TEXT NOT NULL,
        autor VARCHAR(100) NOT NULL
    );

    INSERT INTO citacoes (texto, autor) VALUES
    ('A vida não é um conto de fadas, mas também não é um pesadelo sem fim.', 'Machado de Assis'),
    ('Minha alma é um arquivo de notícias velhas.', 'Clarice Lispector'),
    ('O homem é um animal que caminha no escuro.', 'Guimarães Rosa'),
    ('O amor é uma coisa que a gente nunca sabe como vai dar.', 'Jorge Amado'),
    ('A inteligência quase sempre paga um preço muito alto.', 'Monteiro Lobato'),
    ('Eu sou um ser humano e nada do que é humano me é estranho.', 'Cecília Meireles'),
    ('Ser feliz sem motivo é a mais autêntica forma de felicidade.', 'Carlos Drummond de Andrade'),
    ('A vida é um sopro.', 'Graciliano Ramos'),
    ('A vida é uma comédia para quem pensa e uma tragédia para quem sente.', 'Lima Barreto'),
    ('Quem canta seus males espanta.', 'José de Alencar'),
    ('Deus escreve certo por linhas tortas.', 'Machado de Assis'),
    ('A felicidade é uma borboleta que, quando perseguida, sempre está além do nosso alcance.', 'Machado de Assis'),
    ('Liberdade é pouco. O que eu desejo ainda não tem nome.', 'Clarice Lispector'),
    ('A solidão é uma coisa que se aprende.', 'Clarice Lispector'),
    ('O sertão é onde o homem se refaz.', 'Guimarães Rosa'),
    ('O sertão é o mesmo em todo lugar.', 'Guimarães Rosa'),
    ('O amor é uma palavra bonita, mas é uma coisa difícil de explicar.', 'Jorge Amado'),
    ('A terra é redonda, mas o sertão é quadrado.', 'Guimarães Rosa'),
    ('A vida é uma peça de teatro que não permite ensaios.', 'Machado de Assis'),
    ('Não sou nada. Nunca serei nada. Não posso querer ser nada.', 'Álvares de Azevedo'),
    ('A poesia está no chão, esperando ser escrita.', 'Carlos Drummond de Andrade'),
    ('O tempo é um rio que leva tudo embora.', 'Machado de Assis'),
    ('A literatura é a prova de que a vida não basta.', 'Clarice Lispector'),
    ('O homem nasce bom, a sociedade o corrompe.', 'Monteiro Lobato'),
    ('A vida é uma sucessão de momentos que se perdem no instante em que começam.', 'Machado de Assis'),
    ('O Brasil é o país do futuro, e sempre será.', 'Stefan Zweig'),
    ('A palavra é o instrumento do pensamento.', 'Cecília Meireles'),
    ('O destino não é uma questão de sorte, é uma questão de escolha.', 'Machado de Assis'),
    ('A arte existe porque a vida não basta.', 'Fernando Pessoa'),
    ('O silêncio é uma forma de música.', 'Clarice Lispector');