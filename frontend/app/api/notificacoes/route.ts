import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.accessToken) {
        return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
    }

    const params = new URLSearchParams();
    if (req.nextUrl.searchParams.get("todas") === "true") {
        params.set("todas", "true");
    }
    const limite = req.nextUrl.searchParams.get("limite");
    const offset = req.nextUrl.searchParams.get("offset");
    if (limite) params.set("limite", limite);
    if (offset) params.set("offset", offset);

    const query = params.toString();
    const url = `${process.env.NEXT_PUBLIC_API_URL}/notificacoes${query ? `?${query}` : ""}`;

    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        cache: "no-store",
    });

    const texto = await res.text();
    let data: unknown;
    try {
        data = texto ? JSON.parse(texto) : null;
    } catch {
        return NextResponse.json({ erro: "Resposta inválida do servidor" }, { status: res.status || 502 });
    }

    return NextResponse.json(data, { status: res.status });
}
