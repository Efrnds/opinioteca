import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const session = await auth();

    if (!session?.accessToken) {
        return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.toString();
    const url = `${process.env.NEXT_PUBLIC_API_URL}/avaliacoes${query ? `?${query}` : ""}`;

    const res = await fetch(url, {
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
        return NextResponse.json(
            { erro: res.status === 405 ? "Listagem de avaliações indisponível. Reinicie o backend." : "Resposta inválida do servidor" },
            { status: res.status || 502 },
        );
    }

    return NextResponse.json(data, { status: res.status });
}

export async function POST(req: NextRequest) {
    const session = await auth();

    if (!session?.accessToken) {
        return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
    }

    const body = await req.json();

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/avaliacoes`, {
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
