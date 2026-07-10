"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { rotuloIntervalo } from "@/lib/admin/paginacao";

type AdminPaginacaoProps = {
    pagina: number;
    limite: number;
    total: number;
    onChange: (pagina: number) => void;
    disabled?: boolean;
};

function paginasVisiveis(pagina: number, totalPaginas: number): (number | "…")[] {
    if (totalPaginas <= 7) {
        return Array.from({ length: totalPaginas }, (_, i) => i + 1);
    }

    const pages = new Set<number>();
    pages.add(1);
    pages.add(totalPaginas);
    for (let i = pagina - 1; i <= pagina + 1; i++) {
        if (i >= 1 && i <= totalPaginas) pages.add(i);
    }

    const ordenadas = [...pages].sort((a, b) => a - b);
    const resultado: (number | "…")[] = [];
    for (let i = 0; i < ordenadas.length; i++) {
        if (i > 0 && ordenadas[i] - ordenadas[i - 1] > 1) {
            resultado.push("…");
        }
        resultado.push(ordenadas[i]);
    }
    return resultado;
}

export default function AdminPaginacao({
    pagina,
    limite,
    total,
    onChange,
    disabled = false,
}: AdminPaginacaoProps) {
    const totalPaginas = Math.max(1, Math.ceil(total / Math.max(limite, 1)));
    if (total <= limite && pagina <= 1) {
        if (total <= 0) return null;
        return (
            <div className="flex items-center justify-between gap-3 border-t border-cinza-200 px-4 py-3">
                <p className="font-gabarito-regular text-sm text-cinza-600">
                    {rotuloIntervalo(pagina, limite, total)}
                </p>
            </div>
        );
    }

    const visiveis = paginasVisiveis(pagina, totalPaginas);

    return (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-cinza-200 px-4 py-3">
            <p className="font-gabarito-regular text-sm text-cinza-600">
                {rotuloIntervalo(pagina, limite, total)}
            </p>
            <div className="flex items-center gap-1">
                <button
                    type="button"
                    disabled={disabled || pagina <= 1}
                    onClick={() => onChange(pagina - 1)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-cinza-200 bg-white text-azul-900 transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Página anterior"
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>
                {visiveis.map((item, idx) =>
                    item === "…" ? (
                        <span
                            key={`ellipsis-${idx}`}
                            className="px-1 font-gabarito-regular text-sm text-cinza-500"
                        >
                            …
                        </span>
                    ) : (
                        <button
                            key={item}
                            type="button"
                            disabled={disabled}
                            onClick={() => onChange(item)}
                            className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 font-gabarito-medium text-sm transition ${
                                item === pagina
                                    ? "bg-azul-600 text-white"
                                    : "border border-cinza-200 bg-white text-azul-900 hover:bg-background"
                            } disabled:cursor-not-allowed disabled:opacity-40`}
                        >
                            {item}
                        </button>
                    ),
                )}
                <button
                    type="button"
                    disabled={disabled || pagina >= totalPaginas}
                    onClick={() => onChange(pagina + 1)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-cinza-200 bg-white text-azul-900 transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Próxima página"
                >
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}
