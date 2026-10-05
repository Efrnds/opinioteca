import { headersLoginBackend } from "@/lib/login-client-ip";
import { NextRequest, NextResponse } from "next/server";

/** Proxy de login para reativação — nunca devolve o JWT ao browser. */
export async function POST(req: NextRequest) {
    const body = await req.json();
    const xff = req.headers.get("x-forwarded-for");
    const clientIp =
        xff?.split(",")[0]?.trim() ||
        req.headers.get("x-real-ip")?.trim() ||
        undefined;

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/login`, {
        method: "POST",
        headers: headersLoginBackend(clientIp),
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
