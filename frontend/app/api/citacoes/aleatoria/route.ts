import { NextResponse } from "next/server";

export async function GET() {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/citacoes/aleatoria`, {
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
