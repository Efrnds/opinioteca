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

export default auth((req) => {
    const { pathname } = req.nextUrl;
    const isLoggedIn = !!req.auth;
    const isAdmin = !!req.auth?.isAdmin;

    if (ehRotaAdmin(pathname)) {
        if (!isLoggedIn) {
            const url = new URL("/", req.url);
            url.searchParams.set("auth", "login");
            url.searchParams.set("callbackUrl", pathname);
            return NextResponse.redirect(url);
        }
        if (!isAdmin) {
            return NextResponse.redirect(new URL("/home", req.url));
        }
        return NextResponse.next();
    }

    if (!isLoggedIn && ehRotaProtegida(pathname)) {
        const url = new URL("/", req.url);
        url.searchParams.set("auth", "login");
        url.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(url);
    }

    if (isLoggedIn && pathname === "/") {
        return NextResponse.redirect(new URL("/home", req.url));
    }

    if (!isLoggedIn && !ehRotaPublica(pathname) && !ehRotaProtegida(pathname)) {
        return NextResponse.next();
    }

    return NextResponse.next();
});

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
