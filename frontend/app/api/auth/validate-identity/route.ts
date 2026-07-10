import { auth } from "@/auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type JwtPayload = {
    usuarioId?: number | string;
    exp?: number;
};

/** Decodifica payload JWT sem verificar assinatura (a verificação é no backend). */
function decodeJwtPayload(token: string): JwtPayload | null {
    try {
        const parts = token.split(".");
        if (parts.length < 2) return null;
        const json = Buffer.from(parts[1], "base64url").toString("utf8");
        return JSON.parse(json) as JwtPayload;
    } catch {
        return null;
    }
}

/**
 * Confere se a sessão Auth.js bate com o JWT do backend.
 * Se o cookie/sessão veio de cache de proxy ou secret compartilhado, limpa no cliente.
 */
export async function GET() {
    const noStore = {
        "Cache-Control": "private, no-store, no-cache, max-age=0, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
    };

    const session = await auth();
    if (!session?.accessToken || !session.user?.id || !session.user?.nick) {
        return NextResponse.json({ ok: true, authenticated: false }, { headers: noStore });
    }

    const sessionId = String(session.user.id);
    const nick = session.user.nick;
    const payload = decodeJwtPayload(session.accessToken);
    const tokenUserId = payload?.usuarioId != null ? String(payload.usuarioId) : null;

    if (!tokenUserId || tokenUserId !== sessionId) {
        return NextResponse.json(
            {
                ok: false,
                authenticated: true,
                reason: "jwt_id_mismatch",
                sessionId,
                tokenUserId,
            },
            { status: 409, headers: noStore },
        );
    }

    // Backend: só o dono do token acessa as próprias configurações.
    const api = process.env.NEXT_PUBLIC_API_URL;
    if (!api) {
        return NextResponse.json(
            { ok: false, authenticated: true, reason: "api_url_missing" },
            { status: 500, headers: noStore },
        );
    }

    let backendRes: Response;
    try {
        backendRes = await fetch(`${api}/usuarios/${encodeURIComponent(nick)}/configuracoes`, {
            headers: { Authorization: `Bearer ${session.accessToken}` },
            cache: "no-store",
        });
    } catch {
        // Rede/backend fora — não derruba sessão por flapping.
        return NextResponse.json(
            { ok: true, authenticated: true, skipped: "backend_unreachable" },
            { headers: noStore },
        );
    }

    if (backendRes.status === 401 || backendRes.status === 403) {
        return NextResponse.json(
            {
                ok: false,
                authenticated: true,
                reason: backendRes.status === 403 ? "nick_token_mismatch" : "token_invalid",
                sessionId,
                nick,
            },
            { status: 409, headers: noStore },
        );
    }

    if (!backendRes.ok) {
        return NextResponse.json(
            { ok: true, authenticated: true, skipped: `backend_${backendRes.status}` },
            { headers: noStore },
        );
    }

    return NextResponse.json(
        { ok: true, authenticated: true, id: sessionId, nick },
        { headers: noStore },
    );
}
