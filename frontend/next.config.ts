import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
