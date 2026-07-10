-- Migração única de produção (2026-07-08)
-- Consolida: configuracoes_descoberta, planos_assinatura, opiniopro_features,
--            templates_resenha, templates_admin, usuario_estante
--
-- Idempotente: seguro em bancos parcialmente migrados (IF NOT EXISTS, ON CONFLICT).
-- Não necessário em instalação nova via sql.sql.
--
-- psql $DATABASE_URL -f backend/sql/migrations/20260708_producao.sql

-- =============================================================================
-- 1. Configurações de usuário, privacidade e soft-delete
-- =============================================================================

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS inativado_em TIMESTAMP NULL;

CREATE TABLE IF NOT EXISTS usuario_configuracoes (
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

    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO usuario_configuracoes (usuario_id)
SELECT id FROM usuarios
ON CONFLICT (usuario_id) DO NOTHING;

-- =============================================================================
-- 2. Planos e assinatura manual
-- =============================================================================

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS assinatura_expira_em TIMESTAMP NULL;

ALTER TABLE assinaturas
  ADD COLUMN IF NOT EXISTS modo_zen BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS templates_enriquecidos BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE assinaturas SET codigo = 'gratuito' WHERE codigo = 'free';
UPDATE assinaturas SET codigo = 'opiniotop' WHERE codigo = 'premium';
UPDATE assinaturas SET codigo = 'opiniopro' WHERE codigo = 'pro';

UPDATE assinaturas SET modo_zen = FALSE, templates_enriquecidos = FALSE WHERE codigo = 'gratuito';
UPDATE assinaturas SET modo_zen = FALSE, templates_enriquecidos = TRUE  WHERE codigo = 'opiniotop';
UPDATE assinaturas SET modo_zen = TRUE,  templates_enriquecidos = TRUE  WHERE codigo = 'opiniopro';

-- =============================================================================
-- 3. OpinioPro: meta de leitura e modo zen por usuário
-- =============================================================================

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS modo_zen BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS usuario_meta_leitura (
    usuario_id INTEGER PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo VARCHAR(10) NOT NULL DEFAULT 'paginas'
        CHECK (tipo IN ('paginas', 'livros')),
    periodo VARCHAR(10) NOT NULL DEFAULT 'mensal'
        CHECK (periodo IN ('mensal', 'anual')),
    meta INTEGER NOT NULL CHECK (meta > 0),
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- 4. Templates de resenha (seed + colunas admin + corpo completo)
-- =============================================================================

ALTER TABLE templates
    ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS ordem INTEGER NOT NULL DEFAULT 0;

INSERT INTO templates (id, nome, assinatura_minima_id, estrutura_json) VALUES
(1, 'Emoção pura', (SELECT id FROM assinaturas WHERE codigo = 'opiniotop'), '{"descricao": "Para quando o livro mexeu com você de verdade"}'),
(2, 'Análise crítica', (SELECT id FROM assinaturas WHERE codigo = 'opiniotop'), '{"descricao": "Olhar atento sobre ritmo, personagens e proposta"}'),
(3, 'Opinião rápida', (SELECT id FROM assinaturas WHERE codigo = 'opiniotop'), '{"descricao": "Direto ao ponto, sem enrolação"}'),
(4, 'Recomendação', (SELECT id FROM assinaturas WHERE codigo = 'opiniotop'), '{"descricao": "Para quem quer indicar com clareza"}'),
(5, 'Comparativo', (SELECT id FROM assinaturas WHERE codigo = 'opiniotop'), '{"descricao": "Situa o livro em relação a outros"}'),
(6, 'Estruturado sem spoilers', (SELECT id FROM assinaturas WHERE codigo = 'opiniotop'), '{"descricao": "Formato seguro para não estragar a leitura"}')
ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome,
    assinatura_minima_id = EXCLUDED.assinatura_minima_id,
    estrutura_json = EXCLUDED.estrutura_json;

UPDATE templates SET ordem = id WHERE ordem = 0;

UPDATE templates SET estrutura_json = jsonb_build_object(
    'descricao', 'Para quando o livro mexeu com você de verdade',
    'texto', $txt$Este livro me pegou de um jeito que eu não esperava.

Ainda estou processando [o final / aquela cena / o arco do personagem principal], e acho que isso já diz muito sobre a força da narrativa.

O que mais me marcou foi [momento ou tema, sem spoilers]. Fiquei com a sensação de [emoção] por dias.

Nota pessoal: não é leitura leve, mas é intensa no melhor sentido.$txt$
) WHERE id = 1;

UPDATE templates SET estrutura_json = jsonb_build_object(
    'descricao', 'Olhar atento sobre ritmo, personagens e proposta',
    'texto', $txt$Pontos fortes:
• [Ex.: construção de mundo / diálogos / prosa]
• [Ex.: desenvolvimento de personagem]

Pontos fracos:
• [Ex.: ritmo irregular / desfechos apressados]

O autor propõe [tema central] e, no geral, entrega uma leitura [coerente / instigante / irregular]. A nota reflete o equilíbrio entre o que funcionou e o que poderia ser mais lapidado.$txt$
) WHERE id = 2;

UPDATE templates SET estrutura_json = jsonb_build_object(
    'descricao', 'Direto ao ponto, sem enrolação',
    'texto', $txt$Leitura [rápida / densa / surpreendente].

Gostei de: [um ponto].
Não curti tanto: [outro ponto].

Vale a pena? [Sim / Depende / Só se você gosta de X].$txt$
) WHERE id = 3;

UPDATE templates SET estrutura_json = jsonb_build_object(
    'descricao', 'Para quem quer indicar com clareza',
    'texto', $txt$Recomendo este livro para quem:
✓ Gosta de [gênero ou tom]
✓ Aprecia histórias com [elemento: mistério, romance, crítica social…]
✓ Não se importa com [ritmo lento / narrativa fragmentada / etc.]

É uma boa porta de entrada para [autor / série / tema]. Se você curtiu [livro parecido], provavelmente vai gostar deste também.$txt$
) WHERE id = 4;

UPDATE templates SET estrutura_json = jsonb_build_object(
    'descricao', 'Situa o livro em relação a outros',
    'texto', $txt$Este livro me lembrou [obra ou autor] no tom, mas com [diferença marcante].

Enquanto [referência] aposta em [característica], aqui o destaque vai para [outro aspecto].

Para fãs de [gênero/referência]: [vale muito / pode dividir opiniões].
Para quem não conhece o autor: comece por este ou por [alternativa]? [sua opinião].$txt$
) WHERE id = 5;

UPDATE templates SET estrutura_json = jsonb_build_object(
    'descricao', 'Formato seguro para não estragar a leitura',
    'texto', $txt$▸ Premissa (sem spoilers)
[Uma ou duas frases sobre o enredo inicial.]

▸ O que funcionou
[Estilo, atmosfera, personagens, sem revelar viradas.]

▸ Para quem é
Leitores que buscam [experiência] e toleram [tom/ritmo].

▸ Em resumo
[Frase final com sua impressão geral, mantendo o mistério.]$txt$
) WHERE id = 6;

SELECT setval(pg_get_serial_sequence('templates', 'id'), COALESCE((SELECT MAX(id) FROM templates), 1));

-- =============================================================================
-- 5. Estante pessoal + backfill a partir do diário e resenhas
-- =============================================================================

CREATE TABLE IF NOT EXISTS usuario_estante (
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    livro_id INTEGER NOT NULL REFERENCES livros(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'quero_ler'
        CHECK (status IN ('quero_ler', 'lendo', 'lido')),
    adicionado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (usuario_id, livro_id)
);

CREATE INDEX IF NOT EXISTS idx_usuario_estante_usuario ON usuario_estante(usuario_id);

INSERT INTO usuario_estante (usuario_id, livro_id, status, adicionado_em)
SELECT
    dl.usuario_id,
    dl.livro_id,
    CASE
        WHEN ult.porcentagem >= 100 THEN 'lido'
        WHEN ult.porcentagem > 0 THEN 'lendo'
        ELSE 'quero_ler'
    END,
    ult.data_registro
FROM (
    SELECT DISTINCT usuario_id, livro_id FROM diario_leitura
) dl
INNER JOIN LATERAL (
    SELECT porcentagem_leitura AS porcentagem, data_registro
    FROM diario_leitura
    WHERE usuario_id = dl.usuario_id AND livro_id = dl.livro_id
    ORDER BY data_registro DESC
    LIMIT 1
) ult ON true
ON CONFLICT (usuario_id, livro_id) DO NOTHING;

INSERT INTO usuario_estante (usuario_id, livro_id, status, adicionado_em)
SELECT a.usuario_id, a.livro_id, 'lido', a.criadoEm
FROM avaliacoes a
ON CONFLICT (usuario_id, livro_id) DO UPDATE SET status = 'lido';
