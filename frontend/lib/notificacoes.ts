import type { Notificacao } from "@/types/notificacao";
import { urlAvaliacao } from "@/lib/avaliacao";
import { notificacaoEhMensagem } from "@/lib/ws/types";

/** Normaliza `lida` vindo da API (bool, string, número). */
export function notificacaoEstaLida(valor: unknown): boolean {
    return valor === true || valor === "true" || valor === 1 || valor === "1";
}

export function contarNotificacoesNaoLidas(notificacoes: Notificacao[]): number {
    return notificacoes.filter((n) => !notificacaoEhMensagem(n) && !notificacaoEstaLida(n.lida)).length;
}

export async function resolverDestinoNotificacao(notif: Notificacao): Promise<string> {
    if (notificacaoEhSistema(notif.tipo_notificacao)) {
        return "/notificacoes";
    }

    const ref = notif.referencia_id;
    if (!ref) return "/home";

    switch (notif.tipo_notificacao) {
        case "seguidor":
        case "mensagem": {
            const res = await fetch(`/api/usuarios/id/${ref}`);
            if (res.ok) {
                const u = (await res.json()) as { nick?: string };
                if (u.nick) {
                    return notif.tipo_notificacao === "mensagem"
                        ? `/mensagens?novoChat=${ref}`
                        : `/perfil/${u.nick}`;
                }
            }
            return notif.tipo_notificacao === "mensagem" ? `/mensagens?novoChat=${ref}` : "/home";
        }
        case "comentario":
        case "voto_avaliacao":
        case "avaliacao":
            return urlAvaliacao(ref);
        default:
            return "/home";
    }
}

export function textoAcaoNotificacao(tipo: Notificacao["tipo_notificacao"]): string {
    switch (tipo) {
        case "seguidor":
            return "Seguiu Você";
        case "mensagem":
            return "Enviou mensagem";
        case "comentario":
            return "Comentou";
        case "voto_avaliacao":
            return "Reagiu à avaliação";
        case "avaliacao":
            return "Nova avaliação";
        case "denuncia_resolvida":
            return "Denúncia resolvida";
        case "advertencia":
            return "Advertência";
        case "conta_inativada":
            return "Conta inativada";
        default:
            return "Notificação";
    }
}

export function notificacaoEhSistema(tipo: Notificacao["tipo_notificacao"]): boolean {
    return tipo === "denuncia_resolvida" || tipo === "advertencia" || tipo === "conta_inativada";
}

export function tituloExibicaoNotificacao(notif: Notificacao): string {
    if (notificacaoEhSistema(notif.tipo_notificacao)) {
        return notif.titulo;
    }
    return nomeDoTituloNotificacao(notif.titulo);
}

export function nomeDoTituloNotificacao(titulo: string): string {
    const match = titulo.match(/^(.+?)\s+(começou|enviou|comentou|reagiu)/i);
    return match?.[1] ?? titulo;
}

export function referenciaEhUsuario(tipo: Notificacao["tipo_notificacao"]): boolean {
    return tipo === "seguidor" || tipo === "mensagem";
}
