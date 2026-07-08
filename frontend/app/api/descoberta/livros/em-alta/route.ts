import { proxyResposta, requireSessionToken } from "@/lib/api-proxy";
import { NextRequest, NextResponse } from "next/server";

async function proxyDescoberta(path: string, token: string) {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
    });
    return proxyResposta(res);
}

export async function GET(req: NextRequest) {
    const session = await requireSessionToken();
    if (!session) {
        return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
    }
    const limite = req.nextUrl.searchParams.get("limite") ?? "12";
    return proxyDescoberta(`/descoberta/livros/em-alta?limite=${encodeURIComponent(limite)}`, session.accessToken!);
}
