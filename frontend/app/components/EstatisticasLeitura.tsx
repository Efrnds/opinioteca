"use client";
import type { EstatisticasLeituraResposta, PeriodoEstatisticasLeitura } from "@/types/diario";
import { BookOpen, CalendarDays, CheckCircle2, FileText } from "lucide-react";
import { useState } from "react";
import PlanoUpgradeModal from "./PlanoUpgradeModal";
type EstatisticasLeituraProps = {
    stats: EstatisticasLeituraResposta | null;
    periodo: PeriodoEstatisticasLeitura;
    onPeriodoChange: (periodo: PeriodoEstatisticasLeitura) => void;
    carregando?: boolean;
    ehMeuPerfil?: boolean;
};
function opcoesPeriodo() {
    const hoje = new Date();
    const fuso = "America/Sao_Paulo";
    return [
        { valor: "hoje", rotulo: `Hoje · ${hoje.toLocaleDateString("pt-BR", { timeZone: fuso, day: "2-digit", month: "2-digit" })}` },
        { valor: "semana", rotulo: "Esta semana" },
        { valor: "mes", rotulo: hoje.toLocaleDateString("pt-BR", { timeZone: fuso, month: "long", year: "numeric" }) },
        { valor: "ano", rotulo: hoje.toLocaleDateString("pt-BR", { timeZone: fuso, year: "numeric" }) },
        { valor: "tudo", rotulo: "Tempo todo" },
    ];
}
export default function EstatisticasLeitura({ stats, carregando, ehMeuPerfil, periodo, onPeriodoChange }: EstatisticasLeituraProps) {
    const [upgradeAberto, setUpgradeAberto] = useState(false);
    if (carregando && !stats) {
        return (<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (<div key={i} className="h-20 animate-pulse rounded-2xl bg-cinza-200"/>))}
            </div>);
    }
    if (!stats)
        return null;
    if (!stats.disponivel) {
        if (!stats.teaser || !ehMeuPerfil)
            return null;
        return (<>
                <div className="rounded-2xl border border-dashed border-azul-300 bg-azul-50/60 p-4">
                    <p className="font-gabarito-bold text-base text-azul-900">Estatísticas de leitura</p>
                    <p className="mt-1 font-gabarito-regular text-sm text-cinza-700">
                        Veja páginas lidas, livros finalizados e dias com leitura por dia, semana, mês ou ano. Exclusivo do OpinioTop.
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
                    <button type="button" onClick={() => setUpgradeAberto(true)} className="mt-4 w-full rounded-full bg-azul-600 py-2.5 font-gabarito-bold text-sm text-white transition hover:bg-azul-700">
                        Desbloquear com OpinioTop
                    </button>
                </div>
                <PlanoUpgradeModal open={upgradeAberto} onClose={() => setUpgradeAberto(false)} recurso="estatisticasLeitura"/>
            </>);
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
    return (<div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-gabarito-bold text-base text-azul-900">Estatísticas de leitura</h3>
                <select aria-label="Período das estatísticas de leitura" value={periodo} onChange={(event) => onPeriodoChange(event.target.value as PeriodoEstatisticasLeitura)} className="max-w-full rounded-full border border-cinza-200 bg-white px-3 py-1.5 font-gabarito-regular text-xs text-cinza-600 capitalize outline-none focus:border-azul-600">
                    {opcoesPeriodo().map(({ valor, rotulo }) => (<option key={valor} value={valor}>{rotulo}</option>))}
                </select>
            </div>
            <div aria-busy={carregando} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {carregando ? [1, 2, 3, 4].map((i) => (<div key={i} className="h-24 animate-pulse rounded-2xl bg-cinza-200"/>)) : cards.map(({ rotulo, valor, icone: Icone }) => (<div key={rotulo} className="flex flex-col gap-1 rounded-2xl border border-cinza-200 bg-white px-3 py-3">
                        <Icone className="h-4 w-4 text-azul-600"/>
                        <p className="font-gabarito-bold text-2xl text-azul-900">{valor}</p>
                        <p className="font-gabarito-regular text-[11px] leading-tight text-cinza-600">{rotulo}</p>
                    </div>))}
            </div>
        </div>);
}
