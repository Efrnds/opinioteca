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

/** URL base para WebSocket no browser. */
export function wsBaseUrl(): string {
    const wsExplicit = process.env.NEXT_PUBLIC_WS_URL?.replace(/\/$/, "");
    if (wsExplicit) {
        return wsExplicit;
    }

    if (typeof window !== "undefined") {
        const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
        const onLocalhost =
            window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

        // Dev: backend Go em porta separada do Next
        if (onLocalhost && apiUrl && (apiUrl.includes("localhost") || apiUrl.includes("127.0.0.1"))) {
            return apiUrl;
        }

        // Produção: usar a mesma base da API quando configurada (ex.: subdomínio do backend)
        if (!onLocalhost && apiUrl && !apiUrl.includes("localhost") && !apiUrl.includes("127.0.0.1")) {
            return apiUrl;
        }

        // Fallback: mesmo domínio do front (nginx deve fazer proxy de /ws → backend)
        const protocol = window.location.protocol === "https:" ? "https:" : "http:";
        return `${protocol}//${window.location.host}`;
    }

    return process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:4668";
}
