import { adminFetch, proxyResposta, requireAdminSession } from "@/lib/admin/proxy";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
    const authResult = await requireAdminSession();
    if ("error" in authResult) return authResult.error;

    const query = req.nextUrl.searchParams.toString();
    const path = query ? `/admin/templates?${query}` : "/admin/templates";
    const res = await adminFetch(path, authResult.session.accessToken!);
    return proxyResposta(res);
}

export async function POST(req: NextRequest) {
    const authResult = await requireAdminSession();
    if ("error" in authResult) return authResult.error;

    const body = await req.json();
    const res = await adminFetch("/admin/templates", authResult.session.accessToken!, {
        method: "POST",
        body: JSON.stringify(body),
    });
    return proxyResposta(res);
}
