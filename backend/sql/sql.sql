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
    ('gratuito',  'Gratuito',  1, FALSE, FALSE, FALSE,  0.00,   0.00),
    ('opiniotop', 'OpinioTop', 2, FALSE, FALSE, TRUE,   9.99,  89.99),
    ('opiniopro', 'OpinioPro', 3, TRUE,  TRUE,  TRUE,  19.99, 189.99);


    DROP TABLE IF EXISTS templates CASCADE;

    CREATE TABLE templates (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL UNIQUE,
        assinatura_minima_id INTEGER NOT NULL REFERENCES assinaturas(id),
        estrutura_json JSONB NOT NULL,
        ativo BOOLEAN NOT NULL DEFAULT TRUE,
        ordem INTEGER NOT NULL DEFAULT 0,
        criadoEm TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    INSERT INTO templates (id, nome, assinatura_minima_id, estrutura_json, ordem) VALUES
    (1, 'Emoção pura', (SELECT id FROM assinaturas WHERE codigo = 'opiniotop'), '{"descricao": "Para quando o livro mexeu com você de verdade", "texto": "Este livro me pegou de um jeito que eu não esperava.\n\nAinda estou processando [o final / aquela cena / o arco do personagem principal], e acho que isso já diz muito sobre a força da narrativa.\n\nO que mais me marcou foi [momento ou tema, sem spoilers]. Fiquei com a sensação de [emoção] por dias.\n\nNota pessoal: não é leitura leve, mas é intensa no melhor sentido."}', 1),
    (2, 'Análise crítica', (SELECT id FROM assinaturas WHERE codigo = 'opiniotop'), '{"descricao": "Olhar atento sobre ritmo, personagens e proposta", "texto": "Pontos fortes:\n• [Ex.: construção de mundo / diálogos / prosa]\n• [Ex.: desenvolvimento de personagem]\n\nPontos fracos:\n• [Ex.: ritmo irregular / desfechos apressados]\n\nO autor propõe [tema central] e, no geral, entrega uma leitura [coerente / instigante / irregular]. A nota reflete o equilíbrio entre o que funcionou e o que poderia ser mais lapidado."}', 2),
    (3, 'Opinião rápida', (SELECT id FROM assinaturas WHERE codigo = 'opiniotop'), '{"descricao": "Direto ao ponto, sem enrolação", "texto": "Leitura [rápida / densa / surpreendente].\n\nGostei de: [um ponto].\nNão curti tanto: [outro ponto].\n\nVale a pena? [Sim / Depende / Só se você gosta de X]."}', 3),
    (4, 'Recomendação', (SELECT id FROM assinaturas WHERE codigo = 'opiniotop'), '{"descricao": "Para quem quer indicar com clareza", "texto": "Recomendo este livro para quem:\n✓ Gosta de [gênero ou tom]\n✓ Aprecia histórias com [elemento: mistério, romance, crítica social…]\n✓ Não se importa com [ritmo lento / narrativa fragmentada / etc.]\n\nÉ uma boa porta de entrada para [autor / série / tema]. Se você curtiu [livro parecido], provavelmente vai gostar deste também."}', 4),
    (5, 'Comparativo', (SELECT id FROM assinaturas WHERE codigo = 'opiniotop'), '{"descricao": "Situa o livro em relação a outros", "texto": "Este livro me lembrou [obra ou autor] no tom, mas com [diferença marcante].\n\nEnquanto [referência] aposta em [característica], aqui o destaque vai para [outro aspecto].\n\nPara fãs de [gênero/referência]: [vale muito / pode dividir opiniões].\nPara quem não conhece o autor: comece por este ou por [alternativa]? [sua opinião]."}', 5),
    (6, 'Estruturado sem spoilers', (SELECT id FROM assinaturas WHERE codigo = 'opiniotop'), '{"descricao": "Formato seguro para não estragar a leitura", "texto": "▸ Premissa (sem spoilers)\n[Uma ou duas frases sobre o enredo inicial.]\n\n▸ O que funcionou\n[Estilo, atmosfera, personagens, sem revelar viradas.]\n\n▸ Para quem é\nLeitores que buscam [experiência] e toleram [tom/ritmo].\n\n▸ Em resumo\n[Frase final com sua impressão geral, mantendo o mistério.]"}', 6);

    SELECT setval(pg_get_serial_sequence('templates', 'id'), COALESCE((SELECT MAX(id) FROM templates), 1));

    DROP TABLE IF EXISTS usuarios CASCADE;

    CREATE TABLE usuarios (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        nick VARCHAR(50) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        senha VARCHAR(255) NOT NULL,
        rank_confiabilidade INTEGER NOT NULL DEFAULT 0,
        assinatura_id INTEGER NOT NULL DEFAULT 1 REFERENCES assinaturas(id),
        assinatura_expira_em TIMESTAMP NULL,
        is_admin BOOLEAN NOT NULL DEFAULT FALSE,
        sequencia_atual INTEGER NOT NULL DEFAULT 0,
        maior_sequencia INTEGER NOT NULL DEFAULT 0,
        modo_zen BOOLEAN NOT NULL DEFAULT FALSE,
        status VARCHAR(255) NOT NULL CHECK (status IN ('ativo', 'inativo')),
        image_url VARCHAR(512),
        banner_url VARCHAR(512),
        inativado_em TIMESTAMP NULL,
        criadoEm TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    DROP TABLE IF EXISTS usuario_configuracoes CASCADE;

    CREATE TABLE usuario_configuracoes (
        usuario_id INTEGER PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,

        ocultar_spoilers_padrao BOOLEAN NOT NULL DEFAULT TRUE,
        mostrar_streak BOOLEAN NOT NULL DEFAULT TRUE,

        notif_seguidor BOOLEAN NOT NULL DEFAULT TRUE,
        notif_comentario BOOLEAN NOT NULL DEFAULT TRUE,
        notif_votos BOOLEAN NOT NULL DEFAULT TRUE,
        notif_mensagens BOOLEAN NOT NULL DEFAULT TRUE,

        mensagem_de VARCHAR(20) NOT NULL DEFAULT 'todos'
            CHECK (mensagem_de IN ('todos', 'seguidores', 'ninguem')),
        streak_visivel_para VARCHAR(20) NOT NULL DEFAULT 'todos'
            CHECK (streak_visivel_para IN ('todos', 'seguidores', 'ninguem')),
        historico_visivel_para VARCHAR(20) NOT NULL DEFAULT 'todos'
            CHECK (historico_visivel_para IN ('todos', 'seguidores', 'ninguem')),
        visibilidade_perfil VARCHAR(20) NOT NULL DEFAULT 'publico'
            CHECK (visibilidade_perfil IN ('publico', 'privado')),

        tema VARCHAR(20) NOT NULL DEFAULT 'claro'
            CHECK (tema IN ('claro', 'escuro', 'leitor', 'custom')),
        cor_destaque VARCHAR(32) NOT NULL DEFAULT 'azul',
        cor_fundo_texto VARCHAR(32),
        cor_superficie VARCHAR(32),
        cor_texto VARCHAR(32),
        cor_hover VARCHAR(32),

        atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    DROP TABLE IF EXISTS usuario_meta_leitura CASCADE;

    CREATE TABLE usuario_meta_leitura (
        usuario_id INTEGER PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
        tipo VARCHAR(10) NOT NULL DEFAULT 'paginas'
            CHECK (tipo IN ('paginas', 'livros')),
        periodo VARCHAR(10) NOT NULL DEFAULT 'mensal'
            CHECK (periodo IN ('mensal', 'anual')),
        meta INTEGER NOT NULL CHECK (meta > 0),
        atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    DROP TABLE IF EXISTS usuario_estante CASCADE;

    CREATE TABLE usuario_estante (
        usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        livro_id INTEGER NOT NULL REFERENCES livros(id) ON DELETE CASCADE,
        status VARCHAR(20) NOT NULL DEFAULT 'quero_ler'
            CHECK (status IN ('quero_ler', 'lendo', 'lido')),
        adicionado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (usuario_id, livro_id)
    );

    CREATE INDEX idx_usuario_estante_usuario ON usuario_estante(usuario_id);

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
        tipo_notificacao VARCHAR(255) NOT NULL CHECK (tipo_notificacao IN ('avaliacao', 'comentario', 'seguidor', 'mensagem', 'voto_avaliacao', 'denuncia_resolvida', 'advertencia', 'conta_inativada')),
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