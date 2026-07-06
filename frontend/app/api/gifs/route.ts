import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const session = await auth();

    if (!session?.accessToken) {
        return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
    }

    const apiKey = process.env.GIPHY_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ erro: "GIPHY_API_KEY não configurada" }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() ?? "";

    const url = !q
        ? `https://api.giphy.com/v1/gifs/trending?api_key=${apiKey}&limit=16`
        : `https://api.giphy.com/v1/gifs/search?q=${encodeURIComponent(q)}&api_key=${apiKey}&limit=12`;

    const res = await fetch(url, { cache: "no-store" });
    const texto = await res.text();

    let data: unknown;
    try {
        data = texto ? JSON.parse(texto) : null;
    } catch {
        return NextResponse.json({ erro: "Resposta inválida do Giphy" }, { status: 502 });
    }

    return NextResponse.json(data, { status: res.status });
}
