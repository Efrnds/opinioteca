import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ usuarioId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
    const session = await auth();

    if (!session?.accessToken) {
        return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
    }

    const { usuarioId } = await params;

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/mensagens/${usuarioId}`, {
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

export async function POST(req: NextRequest, { params }: Params) {
    const session = await auth();

    if (!session?.accessToken) {
        return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
    }

    const { usuarioId } = await params;
    const body = await req.json();

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/mensagens/${usuarioId}`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${session.accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
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
