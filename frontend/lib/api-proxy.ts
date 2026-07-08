import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function proxyResposta(res: Response) {
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

/** Headers com Bearer se houver sessão; vazio se guest. */
export async function headersAuthOpcional(): Promise<HeadersInit> {
    const session = await auth();
    if (!session?.accessToken) {
        return {};
    }
    return { Authorization: `Bearer ${session.accessToken}` };
}

export async function requireSessionToken() {
    const session = await auth();
    if (!session?.accessToken) {
        return null;
    }
    return session;
}
