import { NextRequest, NextResponse } from "next/server";

/** Proxy de login para reativação — nunca devolve o JWT ao browser. */
export async function POST(req: NextRequest) {
    const body = await req.json();
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        return NextResponse.json(data, { status: res.status });
    }

    const { token: _token, ...seguro } = data as Record<string, unknown>;
    return NextResponse.json(seguro, { status: res.status });
}
