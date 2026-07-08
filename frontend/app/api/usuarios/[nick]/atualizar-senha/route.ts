import { proxyResposta, requireSessionToken } from "@/lib/api-proxy";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ nick: string }> };

export async function POST(req: NextRequest, { params }: Params) {
    const session = await requireSessionToken();
    if (!session) {
        return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
    }

    const { nick } = await params;
    const body = await req.json();
    const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/usuarios/${encodeURIComponent(nick)}/atualizar-senha`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${session.accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
            cache: "no-store",
        },
    );
    return proxyResposta(res);
}
