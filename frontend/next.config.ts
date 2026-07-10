import type { NextConfig } from "next";

const NO_STORE =
    "private, no-store, no-cache, max-age=0, must-revalidate";

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
            {
                protocol: "https",
                hostname: "**",
            },
            // Google Books costuma devolver capas em http://books.google.com/...
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
        ],
    },
};

export default nextConfig;
