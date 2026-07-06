import { adminFetch, proxyResposta, requireAdminSession } from "@/lib/admin/proxy";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
    const authResult = await requireAdminSession();
    if ("error" in authResult) return authResult.error;

    const { searchParams } = new URL(req.url);
    const query = searchParams.toString();
    const path = query ? `/admin/livros?${query}` : "/admin/livros";

    const res = await adminFetch(path, authResult.session.accessToken!);
    return proxyResposta(res);
}

export async function POST(req: NextRequest) {
    const authResult = await requireAdminSession();
    if ("error" in authResult) return authResult.error;

    const body = await req.json();
    const res = await adminFetch("/admin/livros", authResult.session.accessToken!, {
        method: "POST",
        body: JSON.stringify(body),
    });
    return proxyResposta(res);
}
