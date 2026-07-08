import { headersAuthOpcional, proxyResposta } from "@/lib/api-proxy";
import { NextRequest } from "next/server";

type Params = { params: Promise<{ nick: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
    const { nick } = await params;
    const headers = await headersAuthOpcional();
    const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/usuarios/${encodeURIComponent(nick)}/avaliacoes`,
        { headers, cache: "no-store" },
    );
    return proxyResposta(res);
}
