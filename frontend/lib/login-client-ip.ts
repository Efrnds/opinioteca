/** IP do browser visto pelo Next (para rate limit no Go atrás do BFF). */
export async function ipClienteDosHeaders(): Promise<string | undefined> {
    try {
        const { headers } = await import("next/headers");
        const h = await headers();
        const xff = h.get("x-forwarded-for");
        if (xff) {
            const primeiro = xff.split(",")[0]?.trim();
            if (primeiro) return primeiro;
        }
        const xri = h.get("x-real-ip")?.trim();
        if (xri) return xri;
    } catch {
        // fora de request context
    }
    return undefined;
}

export function headersLoginBackend(clientIp?: string): HeadersInit {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (clientIp) {
        headers["X-Opinioteca-Client-IP"] = clientIp;
        headers["X-Forwarded-For"] = clientIp;
    }
    return headers;
}
