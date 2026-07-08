import { headersAuthOpcional, proxyResposta } from "@/lib/api-proxy";
import { NextRequest } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
    const { id } = await params;
    const headers = await headersAuthOpcional();
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/livros/${encodeURIComponent(id)}/avaliacoes`, {
        headers,
        cache: "no-store",
    });
    return proxyResposta(res);
}
