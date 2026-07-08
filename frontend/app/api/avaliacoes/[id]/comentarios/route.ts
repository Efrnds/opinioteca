import { auth } from "@/auth";
import { headersAuthOpcional, proxyResposta } from "@/lib/api-proxy";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
    const { id } = await params;
    const headers = await headersAuthOpcional();
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/avaliacoes/${id}/comentarios`, {
        headers,
        cache: "no-store",
    });
    return proxyResposta(res);
}

export async function POST(req: NextRequest, { params }: Params) {
    const session = await auth();
    if (!session?.accessToken) {
        return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/avaliacoes/${id}/comentarios`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${session.accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        cache: "no-store",
    });
    return proxyResposta(res);
}
