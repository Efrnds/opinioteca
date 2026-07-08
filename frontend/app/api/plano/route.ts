import { proxyResposta, requireSessionToken } from "@/lib/api-proxy";

export async function GET() {
    const session = await requireSessionToken();
    if (!session?.accessToken || !session.user?.nick) {
        return Response.json({ erro: "Não autenticado" }, { status: 401 });
    }

    const nick = session.user.nick;
    const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/usuarios/${encodeURIComponent(nick)}/plano`,
        {
            headers: { Authorization: `Bearer ${session.accessToken}` },
            cache: "no-store",
        },
    );
    return proxyResposta(res);
}
