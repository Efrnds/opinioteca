import { auth } from "@/auth";
import { proxyResposta } from "@/lib/api-proxy";
import { NextResponse } from "next/server";

export { proxyResposta };

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
