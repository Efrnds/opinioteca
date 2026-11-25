

ALTER TABLE notificacoes DROP CONSTRAINT IF EXISTS notificacoes_tipo_notificacao_check;

ALTER TABLE notificacoes ADD CONSTRAINT notificacoes_tipo_notificacao_check
    CHECK (tipo_notificacao IN (
        'avaliacao', 'comentario', 'seguidor', 'mensagem', 'voto_avaliacao',
        'denuncia_resolvida', 'advertencia', 'conta_inativada'
    ));
