-- Produção: configurações de usuário, privacidade e soft-delete com janela de 30 dias.
-- Execute uma vez no banco existente (não necessário em instalação nova via sql.sql).

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
