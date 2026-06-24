/** Converte URLs absolutas do backend local em caminhos servidos pelo Next (/uploads/...). */
export function mediaUrl(url?: string | null): string | undefined {
    if (!url) return undefined;
    if (url.startsWith("/")) return url;
    if (url.startsWith("blob:") || url.startsWith("data:")) return url;

    try {
        const parsed = new URL(url);
        if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
            return `${parsed.pathname}${parsed.search}`;
        }
    } catch {
        return url;
    }

    return url;
}

/** Converte http(s) em ws(s) para WebSocket. */
export function toWsUrl(base: string, path = ""): string {
    const normalized = base.replace(/^https:/, "wss:").replace(/^http:/, "ws:");
    return `${normalized.replace(/\/$/, "")}${path}`;
}

/** URL base para WebSocket no browser (evita localhost em produção). */
export function wsBaseUrl(): string {
    const env = process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_API_URL || "";

    if (typeof window !== "undefined") {
        if (!env || env.includes("localhost") || env.includes("127.0.0.1")) {
            const protocol = window.location.protocol === "https:" ? "https:" : "http:";
            return `${protocol}//${window.location.host}`;
        }
    }

    return env.replace(/\/$/, "") || "http://localhost:9000";
}
