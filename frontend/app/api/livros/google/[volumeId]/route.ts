import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ volumeId: string }> };

async function proxyResposta(res: Response) {
    if (res.status === 204) {
        return new NextResponse(null, { status: res.status });
    }

    const texto = await res.text();
    let data: unknown;

    try {
        data = texto ? JSON.parse(texto) : null;
    } catch {
        return NextResponse.json({ erro: "Resposta inválida do servidor" }, { status: res.status || 502 });
    }

    return NextResponse.json(data, { status: res.status });
}

export async function GET(_req: NextRequest, { params }: Params) {
    const session = await auth();

    if (!session?.accessToken) {
        return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
    }

    const { volumeId } = await params;

    if (!volumeId?.trim()) {
        return NextResponse.json({ erro: "Volume inválido" }, { status: 400 });
    }

    const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/livros/${encodeURIComponent(volumeId.trim())}`,
        {
            headers: {
                Authorization: `Bearer ${session.accessToken}`,
            },
            cache: "no-store",
        },
    );

    return proxyResposta(res);
}
