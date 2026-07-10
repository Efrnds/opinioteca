import { AUTH_COOKIE_BASES } from "@/lib/auth-cookies";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function nomesParaExpirar(existentes: string[]) {
    const nomes = new Set<string>();
    for (const base of AUTH_COOKIE_BASES) {
        nomes.add(base);
        for (let i = 0; i < 10; i++) {
            nomes.add(`${base}.${i}`);
        }
    }
    for (const name of existentes) {
        if (
            name.includes("opinioteca") ||
            name.includes("authjs") ||
            name.includes("next-auth") ||
            AUTH_COOKIE_BASES.some((b) => name === b || name.startsWith(`${b}.`))
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
    res.headers.set("Cache-Control", "private, no-store, no-cache, max-age=0, must-revalidate");

    for (const name of nomes) {
        const secure = name.startsWith("__Secure-") || name.startsWith("__Host-");
        // Sem `domain` → host-only (não pode limpar cookie com Domain=.prismapp se existir;
        // nesse caso o ops deve apagar manualmente / rotacionar secret).
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
