import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    const formData = await req.formData();

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/upload/avatar`, {
        method: "POST",
        body: formData,
    });

    const data = await res.json().catch(() => ({ erro: "Resposta inválida do servidor" }));

    return NextResponse.json(data, { status: res.status });
}
