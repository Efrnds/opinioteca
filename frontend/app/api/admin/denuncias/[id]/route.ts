import { adminFetch, proxyResposta, requireAdminSession } from "@/lib/admin/proxy";
import { NextRequest } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
    const authResult = await requireAdminSession();
    if ("error" in authResult) return authResult.error;

    const { id } = await params;
    const res = await adminFetch(`/admin/denuncias/${id}`, authResult.session.accessToken!);
    return proxyResposta(res);
}

export async function PATCH(req: NextRequest, { params }: Params) {
    const authResult = await requireAdminSession();
    if ("error" in authResult) return authResult.error;

    const { id } = await params;
    const body = await req.json();
    const res = await adminFetch(`/admin/denuncias/${id}`, authResult.session.accessToken!, {
        method: "PATCH",
        body: JSON.stringify(body),
    });
    return proxyResposta(res);
}
