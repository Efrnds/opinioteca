import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.accessToken) {
        return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
    }

    const todas = req.nextUrl.searchParams.get("todas") === "true";
    const url = `${process.env.NEXT_PUBLIC_API_URL}/notificacoes${todas ? "?todas=true" : ""}`;

    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        cache: "no-store",
    });

    const texto = await res.text();
    let data: unknown;
    try {
        data = texto ? JSON.parse(texto) : null;
    } catch {
        return NextResponse.json({ erro: "Resposta inválida do servidor" }, { status: res.status || 502 });
    }

    return NextResponse.json(data, { status: res.status });
}
