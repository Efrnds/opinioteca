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
        default:
            return "Notificação";
    }
}

export function nomeDoTituloNotificacao(titulo: string): string {
    const match = titulo.match(/^(.+?)\s+(começou|enviou|comentou|reagiu)/i);
    return match?.[1] ?? titulo;
}

export function referenciaEhUsuario(tipo: Notificacao["tipo_notificacao"]): boolean {
    return tipo === "seguidor" || tipo === "mensagem";
}

export function rotuloTipoNotificacao(tipo: Notificacao["tipo_notificacao"]): string {
    switch (tipo) {
        case "seguidor":
            return "Seguidor";
        case "mensagem":
            return "Mensagem";
        case "comentario":
            return "Comentário";
        case "voto_avaliacao":
            return "Voto";
        case "avaliacao":
            return "Avaliação";
        default:
            return "Notificação";
    }
}

export function formatarDataNotificacao(iso: string): string {
    const data = new Date(iso);
    const agora = new Date();
    const diffMs = agora.getTime() - data.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return "Agora";
    if (diffMin < 60) return `${diffMin} min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `${diffD}d`;
    return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}
