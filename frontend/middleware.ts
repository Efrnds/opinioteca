import { auth } from "@/auth";
import { NextResponse } from "next/server";

const prefixosProtegidos = [
    "/home",
    "/explorar",
    "/descoberta",
    "/configuracoes",
    "/mensagens",
    "/notificacoes",
];
const prefixoAdmin = "/admin";

function ehRotaProtegida(pathname: string) {
    return prefixosProtegidos.some((prefixo) => pathname === prefixo || pathname.startsWith(`${prefixo}/`));
}

function ehRotaAdmin(pathname: string) {
    return pathname === prefixoAdmin || pathname.startsWith(`${prefixoAdmin}/`);
}

function ehRotaPublica(pathname: string) {
    return pathname === "/" || pathname.startsWith("/api/auth");
}

/** Impede NPM/CDN de cachear HTML/JSON autenticado (session bleed entre usuários). */
function applyNoStoreHeaders(res: NextResponse) {
    res.headers.set("Cache-Control", "private, no-store, no-cache, max-age=0, must-revalidate");
    res.headers.set("Pragma", "no-cache");
    res.headers.set("Expires", "0");
    res.headers.set("Surrogate-Control", "no-store");
    res.headers.set("CDN-Cache-Control", "no-store");
    res.headers.set("Vary", "Cookie, Authorization");
    return res;
}

export default auth((req) => {
    const { pathname } = req.nextUrl;
    const isLoggedIn = !!req.auth;
    const isAdmin = !!req.auth?.isAdmin;

    const withNoStore = (res: NextResponse) => {
        const skipNoStore =
            pathname.startsWith("/_next") ||
            pathname.startsWith("/uploads/") ||
            /\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|js|css|map)$/i.test(pathname);
        const forceNoStore = pathname.startsWith("/api/auth");
        if (!skipNoStore || forceNoStore) {
            return applyNoStoreHeaders(res);
        }
        return res;
    };

    if (ehRotaAdmin(pathname)) {
        if (!isLoggedIn) {
            const url = new URL("/", req.url);
            url.searchParams.set("auth", "login");
            url.searchParams.set("callbackUrl", pathname);
            return withNoStore(NextResponse.redirect(url));
        }
        if (!isAdmin) {
            return withNoStore(NextResponse.redirect(new URL("/home", req.url)));
        }
        return withNoStore(NextResponse.next());
    }

    if (!isLoggedIn && ehRotaProtegida(pathname)) {
        const url = new URL("/", req.url);
        url.searchParams.set("auth", "login");
        url.searchParams.set("callbackUrl", pathname);
        return withNoStore(NextResponse.redirect(url));
    }

    if (isLoggedIn && pathname === "/") {
        return withNoStore(NextResponse.redirect(new URL("/home", req.url)));
    }

    if (!isLoggedIn && !ehRotaPublica(pathname) && !ehRotaProtegida(pathname)) {
        return withNoStore(NextResponse.next());
    }

    return withNoStore(NextResponse.next());
});

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
