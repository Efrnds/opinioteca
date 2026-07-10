"use client";

import type { EstatisticasLeituraResposta } from "@/types/diario";
import { BookOpen, CalendarDays, CheckCircle2, FileText } from "lucide-react";
import { useState } from "react";
import PlanoUpgradeModal from "./PlanoUpgradeModal";

type EstatisticasLeituraProps = {
    stats: EstatisticasLeituraResposta | null;
    carregando?: boolean;
    ehMeuPerfil?: boolean;
};

function formatarMesReferencia(mes?: string) {
    if (!mes) return "este mês";
    const [ano, mesNum] = mes.split("-");
    const data = new Date(Number(ano), Number(mesNum) - 1, 1);
    if (Number.isNaN(data.getTime())) return "este mês";
    return data.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

export default function EstatisticasLeitura({ stats, carregando, ehMeuPerfil }: EstatisticasLeituraProps) {
    const [upgradeAberto, setUpgradeAberto] = useState(false);

    if (carregando) {
        return (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-20 animate-pulse rounded-2xl bg-cinza-200" />
                ))}
            </div>
        );
    }

    if (!stats) return null;

    if (!stats.disponivel) {
        if (!stats.teaser || !ehMeuPerfil) return null;

        return (
            <>
                <div className="rounded-2xl border border-dashed border-azul-300 bg-azul-50/60 p-4">
                    <p className="font-gabarito-bold text-base text-azul-900">Estatísticas de leitura</p>
                    <p className="mt-1 font-gabarito-regular text-sm text-cinza-700">
                        Veja páginas lidas, livros finalizados e dias com leitura no último mês. Exclusivo do OpinioTop.
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2 opacity-50 blur-[2px] select-none" aria-hidden>
                        <div className="rounded-xl bg-white p-3 text-center">
                            <p className="font-gabarito-bold text-xl text-azul-600">-</p>
                            <p className="text-xs text-cinza-600">páginas</p>
                        </div>
                        <div className="rounded-xl bg-white p-3 text-center">
                            <p className="font-gabarito-bold text-xl text-azul-600">-</p>
                            <p className="text-xs text-cinza-600">finalizados</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setUpgradeAberto(true)}
                        className="mt-4 w-full rounded-full bg-azul-600 py-2.5 font-gabarito-bold text-sm text-white transition hover:bg-azul-700"
                    >
                        Desbloquear com OpinioTop
                    </button>
                </div>
                <PlanoUpgradeModal
                    open={upgradeAberto}
                    onClose={() => setUpgradeAberto(false)}
                    recurso="estatisticasLeitura"
                />
            </>
        );
    }

    const cards = [
        {
            rotulo: "Páginas lidas",
            valor: stats.paginas_lidas_mes ?? 0,
            icone: FileText,
        },
        {
            rotulo: "Livros finalizados",
            valor: stats.livros_finalizados_mes ?? 0,
            icone: CheckCircle2,
        },
        {
            rotulo: "Dias com leitura",
            valor: stats.dias_com_leitura_mes ?? 0,
            icone: CalendarDays,
        },
        {
            rotulo: "Em andamento",
            valor: stats.total_livros_ativos ?? 0,
            icone: BookOpen,
        },
    ];

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-gabarito-bold text-base text-azul-900">Estatísticas de leitura</h3>
                <p className="font-gabarito-regular text-xs text-cinza-600 capitalize">
                    {formatarMesReferencia(stats.mes_referencia)}
                </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {cards.map(({ rotulo, valor, icone: Icone }) => (
                    <div
                        key={rotulo}
                        className="flex flex-col gap-1 rounded-2xl border border-cinza-200 bg-white px-3 py-3"
                    >
                        <Icone className="h-4 w-4 text-azul-600" />
                        <p className="font-gabarito-bold text-2xl text-azul-900">{valor}</p>
                        <p className="font-gabarito-regular text-[11px] leading-tight text-cinza-600">{rotulo}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
