import type { ContadoresVoto } from "@/types/avaliacao";
import type { ComentarioAvaliacao } from "@/types/avaliacao";
import type { Mensagem } from "@/types/mensagem";
import type { Notificacao } from "@/types/notificacao";

export type WsEventType =
    | "NOVA_MENSAGEM"
    | "CONVERSA_LIDA"
    | "MENSAGEM_ATUALIZADA"
    | "MENSAGEM_APAGADA"
    | "NOVA_NOTIFICACAO"
    | "AVALIACAO_ATUALIZADA"
    | "NOVO_COMENTARIO"
    | "COMENTARIO_ATUALIZADO";

export type WsEnvelope<T = unknown> = {
    tipo: WsEventType | string;
    payload: T;
};

export type WsNovaMensagemPayload = {
    mensagem: Mensagem;
    nao_lidas_total: number;
    nao_lidas_conversa: number;
};

export type WsConversaLidaPayload = {
    usuario_id: number;
    nao_lidas_total: number;
    nao_lidas_conversa: number;
};

export type WsMensagemAtualizadaPayload = {
    mensagem: Mensagem;
};

export type WsMensagemApagadaPayload = {
    mensagem_id: number;
    remetente_id: number;
    destinatario_id: number;
    apagado_por_remetente: boolean;
    apagado_por_destinatario: boolean;
    criado_em?: string;
};

export type WsAvaliacaoAtualizadaPayload = {
    avaliacao_id: number;
    votos?: ContadoresVoto;
    qtd_comentarios?: number;
    comentario_destaque?: ComentarioAvaliacao | null;
};

export type WsNovoComentarioPayload = {
    avaliacao_id: number;
    comentario: ComentarioAvaliacao;
    qtd_comentarios: number;
    comentario_destaque?: ComentarioAvaliacao | null;
};

export type WsComentarioAtualizadoPayload = {
    avaliacao_id: number;
    comentario: ComentarioAvaliacao;
    comentario_destaque?: ComentarioAvaliacao | null;
};

export type WsListener = (tipo: WsEventType | string, payload: unknown) => void;

export function isNovaMensagemPayload(payload: unknown): payload is WsNovaMensagemPayload {
    return (
        typeof payload === "object" &&
        payload !== null &&
        "mensagem" in payload &&
        typeof (payload as WsNovaMensagemPayload).mensagem?.id === "number"
    );
}

function isMensagemPlana(payload: unknown): payload is Mensagem {
    return (
        typeof payload === "object" &&
        payload !== null &&
        typeof (payload as Mensagem).id === "number" &&
        "remetente_id" in payload &&
        !("mensagem" in payload)
    );
}

/** Aceita payload novo ({ mensagem, nao_lidas_* }) ou legado (Mensagem direta). */
export function parseNovaMensagem(payload: unknown): WsNovaMensagemPayload | null {
    if (isNovaMensagemPayload(payload)) {
        return {
            mensagem: payload.mensagem,
            nao_lidas_total: payload.nao_lidas_total ?? 0,
            nao_lidas_conversa: payload.nao_lidas_conversa ?? 0,
        };
    }
    if (isMensagemPlana(payload)) {
        return { mensagem: payload, nao_lidas_total: 0, nao_lidas_conversa: 0 };
    }
    return null;
}

export function isNotificacao(payload: unknown): payload is Notificacao {
    return (
        typeof payload === "object" &&
        payload !== null &&
        "tipo_notificacao" in payload &&
        typeof (payload as Notificacao).id === "number"
    );
}

export function notificacaoEhMensagem(notif: Notificacao): boolean {
    return notif.tipo_notificacao === "mensagem";
}
