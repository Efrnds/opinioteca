import { proxyPdfAdmin } from "@/lib/admin/proxy-pdf";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
    return proxyPdfAdmin(req, "/admin/relatorios/pdf/livros");
}
