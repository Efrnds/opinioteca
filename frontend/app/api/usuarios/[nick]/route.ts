import { auth } from "@/auth";
import { headersAuthOpcional, proxyResposta } from "@/lib/api-proxy";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ nick: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
    const session = await auth();
    if (!session?.accessToken) {
        return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
    }

    const { nick } = await params;
    const body = await req.json();
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/usuarios/${encodeURIComponent(nick)}`, {
        method: "PUT",
        headers: {
            Authorization: `Bearer ${session.accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        cache: "no-store",
    });
    return proxyResposta(res);
}

export async function GET(_req: NextRequest, { params }: Params) {
    const { nick } = await params;
    const headers = await headersAuthOpcional();
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/usuarios/${encodeURIComponent(nick)}`, {
        headers,
        cache: "no-store",
    });
    return proxyResposta(res);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
    const session = await auth();
    if (!session?.accessToken) {
        return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
    }

    const { nick } = await params;
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/usuarios/${encodeURIComponent(nick)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.accessToken}` },
        cache: "no-store",
    });
    return proxyResposta(res);
}
