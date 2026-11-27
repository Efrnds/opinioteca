import type { AvaliacaoFeed } from "@/types/avaliacao";

export type AbaFeed = "forYou" | "seguindo";

export type FeedCacheSnapshot = {
    aba: AbaFeed;
    posts: AvaliacaoFeed[];
    nextCursor: string | null;
    anchorPostId: number | null;
    scrollY: number;
    savedAt: number;
};

const TTL_MS = 30 * 60 * 1000;
const cachePorAba = new Map<AbaFeed, FeedCacheSnapshot>();
let ultimaAba: AbaFeed = "forYou";

export function getFeedCache(aba?: AbaFeed): FeedCacheSnapshot | null {
    const chave = aba ?? ultimaAba;
    const snap = cachePorAba.get(chave);
    if (!snap) {
        return null;
    }
    if (Date.now() - snap.savedAt > TTL_MS) {
        cachePorAba.delete(chave);
        return null;
    }
    return snap;
}

export function getUltimaAbaFeed(): AbaFeed {
    return ultimaAba;
}

export function setFeedCache(snap: FeedCacheSnapshot): void {
    if (snap.posts.length === 0) {
        return;
    }
    ultimaAba = snap.aba;
    cachePorAba.set(snap.aba, { ...snap, savedAt: Date.now() });
}

export function clearFeedCache(): void {
    cachePorAba.clear();
    ultimaAba = "forYou";
}

export function resolverPostAncoraVisivel(root: ParentNode = document): number | null {
    const cards = root.querySelectorAll<HTMLElement>("[data-feed-post-id]");
    if (cards.length === 0) {
        return null;
    }
    const alvoTopo = 96;
    let melhor: {
        id: number;
        dist: number;
    } | null = null;
    for (const el of cards) {
        const rect = el.getBoundingClientRect();
        if (rect.bottom < alvoTopo) {
            continue;
        }
        const id = Number(el.dataset.feedPostId);
        if (!Number.isFinite(id)) {
            continue;
        }
        const dist = Math.abs(rect.top - alvoTopo);
        if (!melhor || dist < melhor.dist) {
            melhor = { id, dist };
        }
    }
    if (melhor) {
        return melhor.id;
    }
    const primeiro = Number(cards[0]?.dataset.feedPostId);
    return Number.isFinite(primeiro) ? primeiro : null;
}

export function restaurarScrollFeed(anchorPostId: number | null, scrollY: number): void {
    const tentar = () => {
        if (anchorPostId != null) {
            const el = document.querySelector<HTMLElement>(`[data-feed-post-id="${anchorPostId}"]`);
            if (el) {
                el.scrollIntoView({ block: "start" });
                return true;
            }
        }
        if (scrollY > 0) {
            window.scrollTo({ top: scrollY, behavior: "auto" });
            return true;
        }
        return false;
    };
    if (tentar()) {
        return;
    }
    requestAnimationFrame(() => {
        if (tentar()) {
            return;
        }
        window.setTimeout(() => {
            tentar();
        }, 50);
    });
}
