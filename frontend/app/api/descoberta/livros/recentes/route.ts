import { proxyResposta, requireSessionToken } from "@/lib/api-proxy";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const session = await requireSessionToken();
    if (!session) {
        return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
    }
    const limite = req.nextUrl.searchParams.get("limite") ?? "12";
    const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/descoberta/livros/recentes?limite=${encodeURIComponent(limite)}`,
        {
            headers: { Authorization: `Bearer ${session.accessToken}` },
            cache: "no-store",
        },
    );
    return proxyResposta(res);
}
