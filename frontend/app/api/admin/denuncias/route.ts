import { adminFetch, proxyResposta, requireAdminSession } from "@/lib/admin/proxy";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
    const authResult = await requireAdminSession();
    if ("error" in authResult) return authResult.error;

    const params = req.nextUrl.searchParams.toString();
    const path = params ? `/admin/denuncias?${params}` : "/admin/denuncias";
    const res = await adminFetch(path, authResult.session.accessToken!);
    return proxyResposta(res);
}
