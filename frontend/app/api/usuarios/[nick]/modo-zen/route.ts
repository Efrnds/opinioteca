import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ nick: string }> };

async function proxy(
    req: NextRequest,
    nick: string,
    metodo: string,
    corpo?: unknown,
) {
    const session = await auth();
    if (!session?.accessToken) {
        return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
    }

    const init: RequestInit = {
        method: metodo,
        headers: {
            Authorization: `Bearer ${session.accessToken}`,
            ...(corpo ? { "Content-Type": "application/json" } : {}),
        },
        cache: "no-store",
        ...(corpo ? { body: JSON.stringify(corpo) } : {}),
    };

    const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/usuarios/${encodeURIComponent(nick)}/modo-zen`,
        init,
    );

    const texto = await res.text();
    let data: unknown;
    try {
        data = texto ? JSON.parse(texto) : null;
    } catch {
        return NextResponse.json({ erro: "Resposta inválida do servidor" }, { status: res.status || 502 });
    }

    return NextResponse.json(data, { status: res.status });
}

export async function PUT(req: NextRequest, { params }: Params) {
    const { nick } = await params;
    const corpo = await req.json().catch(() => ({}));
    return proxy(req, nick, "PUT", corpo);
}
