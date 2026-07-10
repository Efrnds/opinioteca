import { proxyResposta } from "@/lib/api-proxy";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
    const limite = req.nextUrl.searchParams.get("limite") ?? "12";
    const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/descoberta/usuarios/rank?limite=${encodeURIComponent(limite)}`,
        { cache: "no-store" },
    );
    return proxyResposta(res);
}
