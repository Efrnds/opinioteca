import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

async function proxyResposta(res: Response) {
    const texto = await res.text();
    let data: unknown;
    try {
        data = texto ? JSON.parse(texto) : null;
    } catch {
        return NextResponse.json({ erro: "Resposta inválida do servidor" }, { status: res.status || 502 });
    }
    return NextResponse.json(data, { status: res.status });
}

export async function POST(_req: NextRequest, { params }: Params) {
    const session = await auth();
    if (!session?.accessToken) {
        return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
    }

    const { id } = await params;
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/mensagens/conversa/${id}/fixar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.accessToken}` },
        cache: "no-store",
    });

    return proxyResposta(res);
}
