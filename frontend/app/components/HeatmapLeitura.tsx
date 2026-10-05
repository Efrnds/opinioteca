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

const LABELS_DIA = ["D", "S", "T", "Q", "Q", "S", "S"];
const MESES_CURTOS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const NIVEL_CLASSE: Record<0 | 1 | 2 | 3 | 4, string> = {
    0: "bg-azul-50 ring-1 ring-inset ring-azul-100/80",
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
    if (razao <= 0.25) return 1;
    if (razao <= 0.5) return 2;
    if (razao <= 0.75) return 3;
    return 4;
}

function montarGrade(dias: DiaAtividadeLeitura[], periodoInicio: string, periodoFim: string) {
    if (!periodoInicio || !periodoFim) {
        return { semanas: [] as Celula[][], labelsMes: [] as { indice: number; label: string }[] };
    }

    const porDia = new Map(dias.map((item) => [item.dia, item]));
    const maxPaginas = dias.reduce((max, item) => Math.max(max, item.paginas), 0);

    const inicioPeriodo = parseLocalDate(periodoInicio);
    const fimPeriodo = parseLocalDate(periodoFim);

    // Alinha ao domingo (padrão BR) e termina no sábado da semana atual.
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

    const labelsMes: { indice: number; label: string }[] = [];
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

export default function HeatmapLeitura({
    dias,
    periodoInicio,
    periodoFim,
    carregando = false,
    className,
}: HeatmapLeituraProps) {
    const { semanas, labelsMes } = useMemo(
        () => montarGrade(dias, periodoInicio, periodoFim),
        [dias, periodoInicio, periodoFim],
    );

    const totalDias = dias.length;
    const totalPaginas = dias.reduce((soma, item) => soma + item.paginas, 0);

    if (carregando) {
        return (
            <div className={cn("flex flex-col gap-3", className)}>
                <div className="h-28 animate-pulse rounded-2xl bg-azul-50" />
            </div>
        );
    }

    if (semanas.length === 0) {
        return (
            <p className={cn("font-gabarito-regular text-sm text-cinza-700", className)}>
                Não foi possível carregar o heatmap de leitura.
            </p>
        );
    }

    return (
        <div className={cn("flex flex-col gap-3", className)}>
            <div className="overflow-x-auto pb-1">
                <div className="inline-flex min-w-full flex-col gap-1.5">
                    <div
                        className="grid gap-1"
                        style={{ gridTemplateColumns: `1.25rem repeat(${semanas.length}, minmax(0, 1fr))` }}
                    >
                        <div />
                        {semanas.map((_, indice) => {
                            const label = labelsMes.find((item) => item.indice === indice);
                            return (
                                <div
                                    key={`mes-${indice}`}
                                    className="h-4 overflow-visible font-gabarito-bold text-[10px] leading-none text-cinza-700"
                                >
                                    {label?.label ?? ""}
                                </div>
                            );
                        })}
                    </div>

                    {LABELS_DIA.map((labelDia, linha) => (
                        <div
                            key={labelDia + linha}
                            className="grid gap-1"
                            style={{ gridTemplateColumns: `1.25rem repeat(${semanas.length}, minmax(0, 1fr))` }}
                        >
                            <span
                                className={cn(
                                    "flex items-center font-gabarito-bold text-[10px] text-cinza-700",
                                    linha % 2 === 1 ? "opacity-100" : "opacity-0 sm:opacity-100",
                                )}
                            >
                                {labelDia}
                            </span>
                            {semanas.map((semana) => {
                                const celula = semana[linha];
                                return (
                                    <div
                                        key={celula.data}
                                        title={
                                            celula.foraDoPeriodo
                                                ? undefined
                                                : celula.paginas > 0
                                                  ? `${new Date(celula.data + "T12:00:00").toLocaleDateString("pt-BR")}: ${celula.paginas} pág. · ${celula.registros} registro${celula.registros === 1 ? "" : "s"}`
                                                  : `${new Date(celula.data + "T12:00:00").toLocaleDateString("pt-BR")}: sem leitura`
                                        }
                                        className={cn(
                                            "aspect-square w-full min-w-[9px] max-w-3.5 rounded-[3px]",
                                            celula.foraDoPeriodo
                                                ? "bg-transparent"
                                                : NIVEL_CLASSE[celula.nivel],
                                        )}
                                    />
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-gabarito-regular text-xs text-cinza-700">
                    {totalDias} dia{totalDias === 1 ? "" : "s"} com leitura · {totalPaginas} páginas no período
                </p>
                <div className="flex items-center gap-1">
                    <span className="font-gabarito-regular text-[10px] text-cinza-700">Menos</span>
                    {([0, 1, 2, 3, 4] as const).map((nivel) => (
                        <div key={nivel} className={cn("h-2.5 w-2.5 rounded-[2px]", NIVEL_CLASSE[nivel])} />
                    ))}
                    <span className="font-gabarito-regular text-[10px] text-cinza-700">Mais</span>
                </div>
            </div>
        </div>
    );
}
