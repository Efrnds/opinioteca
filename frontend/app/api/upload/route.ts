import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    const session = await auth();
    const formData = await req.formData();

    const headers: HeadersInit = {};
    if (session?.accessToken) {
        headers.Authorization = `Bearer ${session.accessToken}`;
    }

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/upload/avatar`, {
        method: "POST",
        headers,
        body: formData,
    });

    const data = await res.json().catch(() => ({ erro: "Resposta inválida do servidor" }));

    return NextResponse.json(data, { status: res.status });
}
