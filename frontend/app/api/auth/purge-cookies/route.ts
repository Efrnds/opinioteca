import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const BASES = [
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
];

function nomesParaExpirar(existentes: string[]) {
    const nomes = new Set<string>();
    for (const base of BASES) {
        nomes.add(base);
        for (let i = 0; i < 10; i++) {
            nomes.add(`${base}.${i}`);
        }
    }
    for (const name of existentes) {
        if (
            name.includes("authjs") ||
            name.includes("next-auth") ||
            BASES.some((b) => name === b || name.startsWith(`${b}.`))
        ) {
            nomes.add(name);
        }
    }
    return nomes;
}

/** Limpa variantes secure/não-secure e chunks — evita sessão fantasma após troca de conta. */
export async function POST() {
    const jar = await cookies();
    const existentes = jar.getAll().map((c) => c.name);
    const nomes = nomesParaExpirar(existentes);
    const res = NextResponse.json({ ok: true });

    for (const name of nomes) {
        const secure = name.startsWith("__Secure-") || name.startsWith("__Host-");
        res.cookies.set(name, "", {
            httpOnly: true,
            path: "/",
            maxAge: 0,
            sameSite: "lax",
            ...(secure ? { secure: true } : {}),
        });
    }

    return res;
}
