"use client";
import type { DiaAtividadeLeitura } from "@/types/diario";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
type HeatmapLeituraProps = {
    dias: DiaAtividadeLeitura[];
    periodoInicio: string;
    periodoFim: string;
    carregando?: boolean;
    className?: string;
};
type Celula = {
    data: string;
    paginas: number;
    registros: number;
    nivel: 0 | 1 | 2 | 3 | 4;
    foraDoPeriodo: boolean;
};
const LABELS_DIA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES_CURTOS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const NIVEL_CLASSE: Record<0 | 1 | 2 | 3 | 4, string> = {
    0: "bg-cinza-200",
    1: "bg-azul-100",
    2: "bg-azul-200",
    3: "bg-azul-400",
    4: "bg-azul-600",
};
function parseLocalDate(valor: string) {
    const [ano, mes, dia] = valor.split("-").map(Number);
    return new Date(ano, mes - 1, dia);
}
function formatLocalDate(data: Date) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
}
function nivelPorPaginas(paginas: number, maxPaginas: number): 0 | 1 | 2 | 3 | 4 {
    if (paginas <= 0 || maxPaginas <= 0) {
        return 0;
    }
    const razao = paginas / maxPaginas;
    if (razao <= 0.25)
        return 1;
    if (razao <= 0.5)
        return 2;
    if (razao <= 0.75)
        return 3;
    return 4;
}
function montarGrade(dias: DiaAtividadeLeitura[], periodoInicio: string, periodoFim: string) {
    if (!periodoInicio || !periodoFim) {
        return { semanas: [] as Celula[][], labelsMes: [] as {
                indice: number;
                label: string;
            }[] };
    }
    const porDia = new Map(dias.map((item) => [item.dia, item]));
    const maxPaginas = dias.reduce((max, item) => Math.max(max, item.paginas), 0);
    const inicioPeriodo = parseLocalDate(periodoInicio);
    const fimPeriodo = parseLocalDate(periodoFim);
    const inicioGrade = new Date(inicioPeriodo);
    inicioGrade.setDate(inicioGrade.getDate() - inicioGrade.getDay());
    const fimGrade = new Date(fimPeriodo);
    fimGrade.setDate(fimGrade.getDate() + (6 - fimGrade.getDay()));
    const semanas: Celula[][] = [];
    const cursor = new Date(inicioGrade);
    while (cursor <= fimGrade) {
        const semana: Celula[] = [];
        for (let i = 0; i < 7; i++) {
            const dataStr = formatLocalDate(cursor);
            const atividade = porDia.get(dataStr);
            const paginas = atividade?.paginas ?? 0;
            const registros = atividade?.registros ?? 0;
            const foraDoPeriodo = cursor < inicioPeriodo || cursor > fimPeriodo;
            semana.push({
                data: dataStr,
                paginas,
                registros,
                nivel: foraDoPeriodo ? 0 : nivelPorPaginas(paginas, maxPaginas),
                foraDoPeriodo,
            });
            cursor.setDate(cursor.getDate() + 1);
        }
        semanas.push(semana);
    }
    const labelsMes: {
        indice: number;
        label: string;
    }[] = [];
    let mesAnterior = -1;
    semanas.forEach((semana, indice) => {
        const primeiroNoPeriodo = semana.find((celula) => !celula.foraDoPeriodo);
        if (!primeiroNoPeriodo) {
            return;
        }
        const mes = parseLocalDate(primeiroNoPeriodo.data).getMonth();
        if (mes !== mesAnterior) {
            labelsMes.push({ indice, label: MESES_CURTOS[mes] });
            mesAnterior = mes;
        }
    });
    return { semanas, labelsMes };
}
export default function HeatmapLeitura({ dias, periodoInicio, periodoFim, carregando = false, className, }: HeatmapLeituraProps) {
    const { semanas, labelsMes } = useMemo(() => montarGrade(dias, periodoInicio, periodoFim), [dias, periodoInicio, periodoFim]);
    const totalDias = dias.filter((dia) => dia.paginas > 0 || dia.registros > 0).length;
    const totalPaginas = dias.reduce((soma, item) => soma + item.paginas, 0);
    if (carregando) {
        return (<div className={cn("flex w-full min-w-0 flex-col gap-4 rounded-2xl border border-cinza-200 p-4", className)}>
                <div className="h-36 animate-pulse rounded-xl bg-cinza-200"/>
            </div>);
    }
    if (semanas.length === 0) {
        return (<p className={cn("font-gabarito-regular text-sm text-cinza-700", className)}>
                Não foi possível carregar seu ano de leitura.
            </p>);
    }
    return (<div className={cn("flex w-full min-w-0 flex-col gap-4 rounded-2xl border border-cinza-200 p-4", className)}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="font-gabarito-medium text-sm text-azul-900">
                    {totalDias.toLocaleString("pt-BR")} dia{totalDias === 1 ? "" : "s"} com leitura
                </p>
                <p className="font-gabarito-regular text-sm text-cinza-600">
                    {totalPaginas.toLocaleString("pt-BR")} páginas no período
                </p>
            </div>

            <div tabIndex={0} role="region" aria-label="Calendário anual de leitura. Role horizontalmente para ver todos os meses." className="overflow-x-auto rounded-lg pb-2 outline-none focus-visible:ring-2 focus-visible:ring-azul-600">
                <div className="flex min-w-[44rem] flex-col gap-1.5">
                    <div aria-hidden="true" className="mb-1 grid gap-1" style={{ gridTemplateColumns: `2rem repeat(${semanas.length}, minmax(0, 1fr))` }}>
                        {labelsMes.map(({ indice, label }, posicao) => {
            const proximo = labelsMes[posicao + 1]?.indice ?? semanas.length;
            if (proximo - indice < 3)
                return null;
            return (<span key={`${label}-${indice}`} style={{ gridColumn: `${indice + 2} / ${proximo + 2}` }} className="font-gabarito-medium text-xs text-cinza-600">
                                    {label}
                                </span>);
        })}
                    </div>

                    {LABELS_DIA.map((labelDia, linha) => (<div key={labelDia + linha} className="grid gap-1" style={{ gridTemplateColumns: `2rem repeat(${semanas.length}, minmax(0, 1fr))` }}>
                            <span className="flex items-center font-gabarito-regular text-[11px] text-cinza-600">
                                {labelDia}
                            </span>
                            {semanas.map((semana) => {
                const celula = semana[linha];
                return (<div key={celula.data} title={celula.foraDoPeriodo
                        ? undefined
                        : celula.paginas > 0
                            ? `${new Date(celula.data + "T12:00:00").toLocaleDateString("pt-BR")}: ${celula.paginas} pág. · ${celula.registros} registro${celula.registros === 1 ? "" : "s"}`
                            : `${new Date(celula.data + "T12:00:00").toLocaleDateString("pt-BR")}: sem leitura`} className={cn("aspect-square w-full rounded-[3px] transition-colors", celula.foraDoPeriodo
                        ? "bg-transparent"
                        : `${NIVEL_CLASSE[celula.nivel]} hover:ring-2 hover:ring-azul-600 hover:ring-offset-1 hover:ring-offset-superficie`)}/>);
            })}
                        </div>))}
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-cinza-200 pt-3">
                <p className="font-gabarito-regular text-xs text-cinza-600">
                    {totalDias === 0 ? "Suas leituras vão preencher este calendário." : "Cada quadrado representa um dia."}
                </p>
                <div className="flex items-center gap-1.5" aria-label="Intensidade de leitura: de menos a mais páginas">
                    <span className="mr-1 font-gabarito-regular text-xs text-cinza-600">Menos</span>
                    {([0, 1, 2, 3, 4] as const).map((nivel) => (<span key={nivel} aria-hidden="true" className={cn("h-3 w-3 rounded-[3px]", NIVEL_CLASSE[nivel])}/>))}
                    <span className="ml-1 font-gabarito-regular text-xs text-cinza-600">Mais</span>
                </div>
            </div>
        </div>);
}
