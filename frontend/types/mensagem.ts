export type MensagemResumo = {
    id: number;
    remetente_id: number;
    conteudo: string;
    anexo_url?: string;
};

export type ConversaResumo = {
    usuario_id: number;
    nome: string;
    nick: string;
    image?: string;
    ultima_mensagem: string;
    ultima_mensagem_em: string;
    enviada_por_mim: boolean;
    fixada: boolean;
    nao_lidas?: number;
};

export type Mensagem = {
    id: number;
    remetente_id: number;
    destinatario_id: number;
    conteudo: string;
    anexo_url?: string;
    lida: boolean;
    editada: boolean;
    resposta_a_id?: number;
    reacao?: string;
    apagado_por_remetente?: boolean;
    apagado_por_destinatario?: boolean;
    resposta_a?: MensagemResumo;
    criado_em: string;
};
