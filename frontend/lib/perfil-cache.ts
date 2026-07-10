import type { AvaliacaoFeed } from "@/types/avaliacao";
import type { DiarioHistoricoResposta, DiarioResposta, EstatisticasLeituraResposta } from "@/types/diario";
import type { LivroPublico } from "@/types/livro";
import type { PlanoStatus } from "@/types/plano";

export type PerfilCacheUsuario = {
    id: number;
    nome: string;
    nick: string;
    image?: string;
    banner?: string;
    email?: string;
    assinaturaId?: number;
    plano?: PlanoStatus;
    perfilPrivado?: boolean;
    contaApagada?: boolean;
    podeMensagem?: boolean;
};

export type PerfilCache = {
    perfil: PerfilCacheUsuario;
    avaliacoes: AvaliacaoFeed[];
    seguidores: PerfilCacheUsuario[];
    seguindo: PerfilCacheUsuario[];
    diario: DiarioResposta;
    historico: DiarioHistoricoResposta;
    estatisticas: EstatisticasLeituraResposta | null;
};

const cachePerfilPorNick = new Map<string, PerfilCache>();
const cacheLivroPorID = new Map<number, LivroPublico>();

export function getPerfilCache(nick: string) {
    return cachePerfilPorNick.get(nick);
}

export function setPerfilCache(nick: string, data: PerfilCache) {
    cachePerfilPorNick.set(nick, data);
}

export function updatePerfilCache(nick: string, partial: Partial<PerfilCache>) {
    const atual = cachePerfilPorNick.get(nick);
    if (!atual) return;
    cachePerfilPorNick.set(nick, { ...atual, ...partial });
}

export function deletePerfilCache(nick: string) {
    cachePerfilPorNick.delete(nick);
}

export function getLivroCache(livroID: number) {
    return cacheLivroPorID.get(livroID);
}

export function hasLivroCache(livroID: number) {
    return cacheLivroPorID.has(livroID);
}

export function setLivroCache(livroID: number, livro: LivroPublico) {
    cacheLivroPorID.set(livroID, livro);
}

/** Limpa caches de perfil ao trocar de usuário; evita vazamento entre sessões. */
export function clearPerfilCache() {
    cachePerfilPorNick.clear();
    cacheLivroPorID.clear();
}
