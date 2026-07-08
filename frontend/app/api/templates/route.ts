import { proxyResposta } from "@/lib/api-proxy";

export async function GET() {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/templates`, {
        cache: "no-store",
    });
    return proxyResposta(res);
}
