import type { Notificacao } from "@/types/notificacao";
import type { AvaliacaoFeed } from "@/types/avaliacao";

/** Normaliza o flag de spoiler vindo da API (bool, string, número). */
export function avaliacaoTemSpoiler(valor: unknown): boolean {
    return valor === true || valor === "true" || valor === 1 || valor === "1";
}

export function normalizarPostFeed(post: AvaliacaoFeed): AvaliacaoFeed {
    return {
        ...post,
        contem_spoiler: avaliacaoTemSpoiler(post.contem_spoiler),
    };
}