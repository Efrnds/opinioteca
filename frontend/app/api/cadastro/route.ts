import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    const body = await req.json();

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/usuarios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({ erro: "Resposta inválida do servidor" }));

    return NextResponse.json(data, { status: res.status });
}
