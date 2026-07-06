import { adminFetch, proxyResposta, requireAdminSession } from "@/lib/admin/proxy";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
    const authResult = await requireAdminSession();
    if ("error" in authResult) return authResult.error;

    const { searchParams } = new URL(req.url);
    const query = searchParams.toString();
    const res = await adminFetch(`/admin/relatorios/comentarios?${query}`, authResult.session.accessToken!);
    return proxyResposta(res);
}
