export function useSecureAuthCookies() {
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
export function opiniotecaCookieOptions(secure = useSecureAuthCookies()) {
    return {
        httpOnly: true,
        sameSite: "lax" as const,
        path: "/",
        secure,
    };
}
export const AUTH_COOKIE_BASES = [
    "opinioteca.session-token",
    "__Host-opinioteca.session-token",
    "opinioteca.callback-url",
    "__Host-opinioteca.callback-url",
    "opinioteca.csrf-token",
    "__Host-opinioteca.csrf-token",
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
