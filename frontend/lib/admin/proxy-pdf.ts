import { adminFetch, requireAdminSession } from "@/lib/admin/proxy";
import { NextRequest, NextResponse } from "next/server";

/** Proxy binário de PDF do backend admin. */
export async function proxyPdfAdmin(req: NextRequest, backendPath: string) {
    const authResult = await requireAdminSession();
    if ("error" in authResult) return authResult.error;

    const { searchParams } = new URL(req.url);
    const query = searchParams.toString();
    const path = query ? `${backendPath}?${query}` : backendPath;
    const res = await adminFetch(path, authResult.session.accessToken!, {
        headers: { Accept: "application/pdf" },
    });

    if (!res.ok) {
        const texto = await res.text();
        try {
            const data = JSON.parse(texto);
            return NextResponse.json(data, { status: res.status });
        } catch {
            return NextResponse.json(
                { erro: texto || "Erro ao gerar relatório" },
                { status: res.status || 502 },
            );
        }
    }

    const buffer = await res.arrayBuffer();
    const disposition = res.headers.get("Content-Disposition") ?? 'attachment; filename="relatorio.pdf"';
    return new NextResponse(buffer, {
        status: 200,
        headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": disposition,
        },
    });
}
