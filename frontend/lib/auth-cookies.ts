/**
 * Cookies Auth.js exclusivos da Opinioteca (host-only, sem Domain).
 * Nomes únicos evitam colisão com calmera-os / outros apps em *.prismapp.com.br
 * se alguém configurar Domain=.prismapp.com.br ou reutilizar AUTH_SECRET.
 *
 * `__Host-` (produção HTTPS): Secure + Path=/ + sem Domain — o browser rejeita Domain.
 */
export function useSecureAuthCookies() {
    // Produção atrás de NPM/SSL; em dev HTTP o prefixo __Host- não grava.
    return process.env.NODE_ENV === "production";
}

export function opiniotecaCookieNames(secure = useSecureAuthCookies()) {
    const host = secure ? "__Host-" : "";
    return {
        sessionToken: `${host}opinioteca.session-token`,
        callbackUrl: `${host}opinioteca.callback-url`,
        csrfToken: `${host}opinioteca.csrf-token`,
    } as const;
}

/** Opções host-only — nunca definir `domain`. */
export function opiniotecaCookieOptions(secure = useSecureAuthCookies()) {
    return {
        httpOnly: true,
        sameSite: "lax" as const,
        path: "/",
        secure,
    };
}

/** Nomes legados Auth.js/next-auth + opinioteca (incl. chunks) para purge. */
export const AUTH_COOKIE_BASES = [
    // Novos (opinioteca)
    "opinioteca.session-token",
    "__Host-opinioteca.session-token",
    "opinioteca.callback-url",
    "__Host-opinioteca.callback-url",
    "opinioteca.csrf-token",
    "__Host-opinioteca.csrf-token",
    // Legados Auth.js (podem existir de deploys anteriores)
    "authjs.session-token",
    "__Secure-authjs.session-token",
    "authjs.callback-url",
    "__Secure-authjs.callback-url",
    "authjs.csrf-token",
    "__Host-authjs.csrf-token",
    "next-auth.session-token",
    "__Secure-next-auth.session-token",
    "next-auth.callback-url",
    "__Secure-next-auth.callback-url",
    "next-auth.csrf-token",
    "__Host-next-auth.csrf-token",
] as const;
