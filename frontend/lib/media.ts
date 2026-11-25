export function mediaUrl(url?: string | null): string | undefined {
    if (!url)
        return undefined;
    if (url.startsWith("/"))
        return url;
    if (url.startsWith("blob:") || url.startsWith("data:"))
        return url;
    try {
        const parsed = new URL(url);
        if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
            if (parsed.pathname.startsWith("/uploads/")) {
                return `${parsed.pathname}${parsed.search}`;
            }
            return `${parsed.pathname}${parsed.search}`;
        }
        if (parsed.protocol === "http:" &&
            (parsed.hostname === "books.google.com" ||
                parsed.hostname === "books.googleusercontent.com" ||
                parsed.hostname.endsWith(".googleusercontent.com"))) {
            parsed.protocol = "https:";
            return parsed.toString();
        }
    }
    catch {
        return url;
    }
    return url;
}
export function toWsUrl(base: string, path = ""): string {
    const normalized = base.replace(/^https:/, "wss:").replace(/^http:/, "ws:");
    return `${normalized.replace(/\/$/, "")}${path}`;
}
export function wsBaseUrl(): string {
    const wsExplicit = process.env.NEXT_PUBLIC_WS_URL?.replace(/\/$/, "");
    if (wsExplicit) {
        return wsExplicit;
    }
    if (typeof window !== "undefined") {
        const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
        const onLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
        if (onLocalhost && apiUrl && (apiUrl.includes("localhost") || apiUrl.includes("127.0.0.1"))) {
            return apiUrl;
        }
        const protocol = window.location.protocol === "https:" ? "https:" : "http:";
        return `${protocol}//${window.location.host}`;
    }
    return process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:4668";
}
