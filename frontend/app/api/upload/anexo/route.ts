import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.accessToken) {
        return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
    }

    const formData = await req.formData();
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/upload/anexo`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.accessToken}` },
        body: formData,
    });

    const data = await res.json().catch(() => ({ erro: "Resposta inválida do servidor" }));
    return NextResponse.json(data, { status: res.status });
}
