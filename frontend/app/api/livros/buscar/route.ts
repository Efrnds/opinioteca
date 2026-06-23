import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const session = await auth();

    if (!session?.accessToken) {
        return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");

    if (!q?.trim()) {
        return NextResponse.json({ erro: "Informe um termo de busca" }, { status: 400 });
    }

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/livros/buscar?q=${encodeURIComponent(q.trim())}`, {
        headers: {
            Authorization: `Bearer ${session.accessToken}`,
        },
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
