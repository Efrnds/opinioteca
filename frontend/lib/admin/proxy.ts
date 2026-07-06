import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function requireAdminSession() {
    const session = await auth();

    if (!session?.accessToken) {
        return { error: NextResponse.json({ erro: "Não autenticado" }, { status: 401 }) } as const;
    }

    if (!session.isAdmin) {
        return { error: NextResponse.json({ erro: "Acesso negado" }, { status: 403 }) } as const;
    }

    return { session } as const;
}

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

export function adminFetch(path: string, token: string, init?: RequestInit) {
    const url = `${process.env.NEXT_PUBLIC_API_URL}${path}`;
    return fetch(url, {
        ...init,
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            ...init?.headers,
        },
        cache: "no-store",
    });
}
