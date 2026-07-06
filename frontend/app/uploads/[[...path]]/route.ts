import { NextRequest, NextResponse } from "next/server";

function backendBase() {
    return process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:9000";
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
    const { path = [] } = await params;
    if (path.length === 0) {
        return NextResponse.json({ erro: "Arquivo não informado" }, { status: 400 });
    }

    const segmentos = path.map((p) => encodeURIComponent(p)).join("/");
    const res = await fetch(`${backendBase()}/uploads/${segmentos}`, { cache: "no-store" });

    if (!res.ok) {
        return NextResponse.json({ erro: "Arquivo não encontrado" }, { status: res.status });
    }

    const contentType = res.headers.get("content-type") || "application/octet-stream";
    const body = await res.arrayBuffer();

    return new NextResponse(body, {
        status: 200,
        headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=86400",
        },
    });
}
