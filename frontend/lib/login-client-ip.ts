export async function ipClienteDosHeaders(): Promise<string | undefined> {
    try {
        const { headers } = await import("next/headers");
        const h = await headers();
        const xff = h.get("x-forwarded-for");
        if (xff) {
            const primeiro = xff.split(",")[0]?.trim();
            if (primeiro)
                return primeiro;
        }
        const xri = h.get("x-real-ip")?.trim();
        if (xri)
            return xri;
    }
    catch {
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
