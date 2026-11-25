import { temPlanoPro as temPlanoProDeId } from "@/lib/plano";
import type { PlanoStatus } from "@/types/plano";
const ACESSIBILIDADE_STORAGE_KEY = "opinioteca-acessibilidade";
const stillClientCache = new Map<string, Promise<string | null>>();
export function ehAvatarGif(url?: string | null): boolean {
    if (!url)
        return false;
    return /\.gif(\?|#|$)/i.test(url);
}
export function ehAvatarAnimadoParaAcessibilidade(url?: string | null): boolean {
    if (!url)
        return false;
    if (ehAvatarGif(url))
        return true;
    if (/\/uploads\/avatars\/[^/?#]+\.webp(\?|#|$)/i.test(url))
        return true;
    try {
        const parsed = new URL(url, "http://local");
        return /\/uploads\/avatars\/[^/?#]+\.webp$/i.test(parsed.pathname);
    }
    catch {
        return false;
    }
}
function reduzirMovimentoAtivo(): boolean {
    if (typeof document !== "undefined") {
        if (document.documentElement.getAttribute("data-acess-reduce-motion") === "true") {
            return true;
        }
    }
    if (typeof window === "undefined")
        return false;
    try {
        const raw = localStorage.getItem(ACESSIBILIDADE_STORAGE_KEY);
        if (!raw)
            return false;
        const parsed = JSON.parse(raw) as {
            reduzirMovimento?: boolean;
        };
        return !!parsed.reduzirMovimento;
    }
    catch {
        return false;
    }
}
export function gifBloqueadoPorReducaoMovimento(imageUrl?: string | null): boolean {
    if (!ehAvatarAnimadoParaAcessibilidade(imageUrl))
        return false;
    return reduzirMovimentoAtivo();
}
export function avatarGifPreviewUrl(imageUrl?: string | null): string | undefined {
    if (!imageUrl)
        return undefined;
    if (!ehAvatarGif(imageUrl) && !/\/uploads\/avatars\/[^/?#]+\.webp(\?|#|$)/i.test(imageUrl)) {
        return undefined;
    }
    if (imageUrl.startsWith("/uploads/avatars/")) {
        return imageUrl.replace(/\.(gif|webp)(\?|#|$)/i, ".still.png$2");
    }
    try {
        const parsed = new URL(imageUrl);
        if (!parsed.pathname.startsWith("/uploads/avatars/"))
            return undefined;
        parsed.pathname = parsed.pathname.replace(/\.(gif|webp)$/i, ".still.png");
        return parsed.toString();
    }
    catch {
        return undefined;
    }
}
export function limparCachePreviewAvatar() {
    stillClientCache.clear();
}
export function gerarStillClient(url: string): Promise<string | null> {
    if (typeof window === "undefined")
        return Promise.resolve(null);
    let urlCarregar = url;
    try {
        const parsed = new URL(url, window.location.origin);
        if (parsed.pathname.startsWith("/uploads/") &&
            (parsed.hostname === "localhost" ||
                parsed.hostname === "127.0.0.1" ||
                parsed.hostname === window.location.hostname)) {
            urlCarregar = `${parsed.pathname}${parsed.search}`;
        }
    }
    catch {
    }
    const cached = stillClientCache.get(urlCarregar);
    if (cached)
        return cached;
    const promise = new Promise<string | null>((resolve) => {
        const img = new window.Image();
        img.decoding = "async";
        const sameOrigin = urlCarregar.startsWith("/") ||
            urlCarregar.startsWith(window.location.origin) ||
            urlCarregar.startsWith("data:");
        if (!sameOrigin) {
            img.crossOrigin = "anonymous";
        }
        const finalizar = (resultado: string | null) => resolve(resultado);
        img.onload = () => {
            try {
                const canvas = document.createElement("canvas");
                const w = img.naturalWidth || img.width;
                const h = img.naturalHeight || img.height;
                if (!w || !h) {
                    finalizar(null);
                    return;
                }
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext("2d");
                if (!ctx) {
                    finalizar(null);
                    return;
                }
                ctx.drawImage(img, 0, 0);
                finalizar(canvas.toDataURL("image/png"));
            }
            catch {
                finalizar(null);
            }
        };
        img.onerror = () => finalizar(null);
        img.src = urlCarregar;
    });
    stillClientCache.set(urlCarregar, promise);
    return promise;
}
export function ehAvatarAnimadoPro(url?: string | null): boolean {
    if (!url)
        return false;
    if (ehAvatarGif(url))
        return true;
    if (/\/uploads\/avatars\/[^/?#]+\.webp(\?|#|$)/i.test(url))
        return true;
    try {
        const parsed = new URL(url, "http://local");
        return /\/uploads\/avatars\/[^/?#]+\.webp$/i.test(parsed.pathname);
    }
    catch {
        return false;
    }
}
export function podeExibirAvatarGif(imageUrl?: string | null, assinaturaId?: number, plano?: PlanoStatus, temPlanoPro?: boolean): boolean {
    if (!ehAvatarAnimadoPro(imageUrl))
        return true;
    if (gifBloqueadoPorReducaoMovimento(imageUrl))
        return false;
    if (temPlanoPro != null)
        return temPlanoPro;
    if (plano)
        return plano.temPlanoPro;
    if (assinaturaId != null)
        return temPlanoProDeId(assinaturaId, plano);
    return true;
}
