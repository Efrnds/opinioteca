import type { NextConfig } from "next";

const NO_STORE =
    "private, no-store, no-cache, max-age=0, must-revalidate";

type RemotePattern = {
    protocol?: "http" | "https";
    hostname: string;
    port?: string;
    pathname?: string;
};

function patternDeUrl(raw: string | undefined, pathname = "/**"): RemotePattern | null {
    if (!raw?.trim()) return null;
    try {
        const u = new URL(raw);
        if (u.protocol !== "http:" && u.protocol !== "https:") return null;
        const pattern: RemotePattern = {
            protocol: u.protocol.replace(":", "") as "http" | "https",
            hostname: u.hostname,
            pathname,
        };
        if (u.port) pattern.port = u.port;
        return pattern;
    } catch {
        return null;
    }
}

function remotePatternsDaApi(): RemotePattern[] {
    const candidatos = [
        process.env.AUTH_URL,
        process.env.NEXT_PUBLIC_API_URL,
        process.env.API_INTERNAL_URL,
        // Host público de produção (uploads via nginx no mesmo domínio).
        "https://opinioteca.prismapp.com.br",
    ];

    const vistos = new Set<string>();
    const patterns: RemotePattern[] = [];

    for (const raw of candidatos) {
        const p = patternDeUrl(raw, "/uploads/**");
        if (!p) continue;
        const chave = `${p.protocol}|${p.hostname}|${p.port ?? ""}`;
        if (vistos.has(chave)) continue;
        vistos.add(chave);
        patterns.push(p);
    }

    return patterns;
}

const nextConfig: NextConfig = {
    async headers() {
        return [
            {
                // Auth.js + validação — nunca cachear (NPM Cache Assets / CDN).
                source: "/api/auth/:path*",
                headers: [
                    { key: "Cache-Control", value: NO_STORE },
                    { key: "Pragma", value: "no-cache" },
                    { key: "CDN-Cache-Control", value: "no-store" },
                    { key: "Surrogate-Control", value: "no-store" },
                    { key: "Vary", value: "Cookie, Authorization" },
                ],
            },
            {
                // HTML autenticado / RSC — reforço além do middleware.
                source: "/:path*",
                headers: [
                    { key: "Vary", value: "Cookie" },
                ],
            },
        ];
    },
    images: {
        dangerouslyAllowLocalIP: process.env.NODE_ENV === "development",
        remotePatterns: [
            ...remotePatternsDaApi(),
            // Google Books costuma devolver capas em http(s)://books.google.com/...
            {
                protocol: "http",
                hostname: "books.google.com",
                pathname: "/**",
            },
            {
                protocol: "http",
                hostname: "books.googleusercontent.com",
                pathname: "/**",
            },
            {
                protocol: "https",
                hostname: "books.google.com",
                pathname: "/**",
            },
            {
                protocol: "https",
                hostname: "books.googleusercontent.com",
                pathname: "/**",
            },
            {
                protocol: "https",
                hostname: "*.googleusercontent.com",
                pathname: "/**",
            },
            // Giphy (anexos / picker — se algum <Image> usar URL absoluta)
            {
                protocol: "https",
                hostname: "*.giphy.com",
                pathname: "/**",
            },
            {
                protocol: "https",
                hostname: "media.giphy.com",
                pathname: "/**",
            },
            {
                protocol: "http",
                hostname: "localhost",
                port: "9000",
                pathname: "/uploads/**",
            },
            {
                protocol: "http",
                hostname: "localhost",
                port: "4668",
                pathname: "/uploads/**",
            },
            {
                protocol: "http",
                hostname: "127.0.0.1",
                port: "4668",
                pathname: "/uploads/**",
            },
        ],
    },
};

export default nextConfig;
