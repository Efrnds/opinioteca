"use client";
import Box from "@/app/components/Box";
import AdminPageHeader from "@/app/components/admin/AdminPageHeader";
import { RELATORIOS, type RelatorioSlug } from "@/lib/admin/relatorios";
import { Download, Loader2 } from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import { useState } from "react";

function endpointPdf(slug: RelatorioSlug, q: string): string | null {
    const config = RELATORIOS[slug];
    const params = new URLSearchParams({ q });
    if (config.apiCategoria === "comentarios") {
        params.set("tipo", config.apiTipo);
        return `/api/admin/relatorios/pdf/comentarios?${params}`;
    }
    if (config.apiCategoria === "livros") {
        params.set("tipo", config.apiTipo);
        return `/api/admin/relatorios/pdf/livros?${params}`;
    }
    if (config.apiCategoria === "seguidores-seguindo") {
        return `/api/admin/relatorios/pdf/seguidores-seguindo?${params}`;
    }
    if (config.apiCategoria === "historico-leitura") {
        return `/api/admin/relatorios/pdf/historico-leitura?${params}`;
    }
    return null;
}

export default function AdminRelatorioPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const slug = params.slug as RelatorioSlug;
    const q = searchParams.get("q") ?? "";
    const config = RELATORIOS[slug];
    const [gerando, setGerando] = useState(false);

    if (!config) {
        return <p className="font-gabarito-regular text-cinza-700">Relatório não encontrado.</p>;
    }

    async function gerarPdf() {
        const url = endpointPdf(slug, q);
        if (!url) {
            return;
        }
        if (!q.trim()) {
            return;
        }
        setGerando(true);
        try {
            const res = await fetch(url);
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.erro ?? "Erro ao gerar PDF");
            }
            const blob = await res.blob();
            const objectUrl = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = objectUrl;
            a.download = `relatorio-${slug}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(objectUrl);
        }
        catch {
            return;
        }
        finally {
            setGerando(false);
        }
    }

    return (
        <>
            <AdminPageHeader titulo={config.titulo} />

            <Box className="max-w-xl p-6">
                <p className="font-gabarito-regular text-sm text-cinza-700">{config.subtitulo}</p>
                {q ? (
                    <p className="mt-3 font-gabarito-medium text-sm text-azul-900">
                        Consulta: <span className="font-gabarito-regular">{q}</span>
                    </p>
                ) : (
                    <p className="mt-3 font-gabarito-regular text-sm text-amber-700">
                        Nenhuma consulta informada. Abra o relatório pelo menu Relatórios.
                    </p>
                )}

                <button
                    type="button"
                    onClick={gerarPdf}
                    disabled={gerando || !q.trim()}
                    className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-azul-600 px-6 py-3.5 font-gabarito-bold text-sm text-white transition hover:bg-azul-500 disabled:opacity-60 sm:w-auto"
                >
                    {gerando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    Gerar PDF
                </button>
            </Box>
        </>
    );
}
