"use client";

import { cn } from "@/lib/utils";
import type { DiarioResposta } from "@/types/diario";
import { Book, Plus } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import Box from "./Box";
import RegistrarLeituraModal from "./RegistrarLeituraModal";

const linksAjuda = ["Tem nos campi?", "Opção 2", "Opção 3"];

export default function MenuDireito() {
    const { data: session } = useSession();
    const [diario, setDiario] = useState<DiarioResposta | null>(null);
    const [carregando, setCarregando] = useState(true);
    const [modalAberto, setModalAberto] = useState(false);

    const nick = session?.user?.nick;
    const diaHoje = new Date().getDay();

    const carregarDiario = useCallback(async () => {
        if (!nick) {
            setCarregando(false);
            return;
        }

        setCarregando(true);
        try {
            const res = await fetch(`/api/diario/${encodeURIComponent(nick)}`);
            const data: DiarioResposta = await res.json();
            if (res.ok) {
                setDiario(data);
            }
        } catch {
            setDiario(null);
        } finally {
            setCarregando(false);
        }
    }, [nick]);

    useEffect(() => {
        carregarDiario();
    }, [carregarDiario]);

    useEffect(() => {
        function onRefresh() {
            carregarDiario();
        }

        window.addEventListener("diario:refresh", onRefresh);
        return () => window.removeEventListener("diario:refresh", onRefresh);
    }, [carregarDiario]);

    const sequencia = diario?.semana ?? [];
    const streak = diario?.sequencia_atual ?? 0;
    const jaLeuHoje = !carregando && !!sequencia[diaHoje]?.leu;

    return (
        <section className="flex h-full w-full min-w-0 flex-col justify-between gap-4 overflow-hidden lg:gap-11">
            <Box className="flex w-full min-w-0 flex-col gap-3 p-3 lg:gap-2.5 lg:p-4">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <h2 className="font-gabarito-bold text-sm leading-tight text-azul-900 sm:text-base lg:text-xl">
                            Como está a semana?
                        </h2>
                        <p className="mt-0.5 hidden font-gabarito-regular text-xs text-cinza-700 sm:block lg:text-base">
                            Dias com histórico de leitura
                        </p>
                    </div>
                    <p
                        className={cn(
                            "shrink-0 font-gabarito-bold text-base sm:text-lg lg:text-xl",
                            carregando || streak > 0 ? "text-[#ed2d00]" : "text-cinza-500",
                        )}
                    >
                        {carregando ? "…" : streak}{" "}
                        <span className={cn("text-lg sm:text-xl lg:text-2xl", streak === 0 && !carregando && "grayscale")}>
                            🔥
                        </span>
                    </p>
                </div>

                <div className="grid w-full min-w-0 grid-cols-7 gap-0.5 sm:gap-1.5 lg:gap-2.5">
                    {Array.from({ length: 7 }, (_, index) => {
                        const item = sequencia[index];
                        const leu = !carregando && !!item?.leu;
                        const hoje = !carregando && index === diaHoje;
                        const dia = item?.dia ?? ["D", "S", "T", "Q", "Q", "S", "S"][index];

                        return (
                            <div key={index} className="flex min-w-0 flex-col items-center gap-0.5 sm:gap-1.5">
                                <div
                                    className={cn(
                                        "flex aspect-square w-full max-w-10 items-center justify-center rounded-full sm:max-w-9 lg:max-w-10",
                                        carregando ? "animate-pulse bg-azul-200" : leu ? "bg-azul-800" : "bg-azul-200",
                                        hoje && "ring-2 ring-azul-600 ring-offset-1",
                                    )}
                                >
                                    {!carregando && (
                                        <Book
                                            className={cn(
                                                "h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5",
                                                leu ? "text-azul-200" : "text-azul-400",
                                            )}
                                        />
                                    )}
                                </div>
                                <p
                                    className={cn(
                                        "font-gabarito-bold text-[10px] sm:text-sm lg:text-xl",
                                        carregando ? "text-azul-400" : leu ? "text-azul-800" : "text-azul-400",
                                    )}
                                >
                                    {dia}
                                </p>
                            </div>
                        );
                    })}
                </div>

                <button
                    type="button"
                    disabled={jaLeuHoje}
                    onClick={() => setModalAberto(true)}
                    className={cn(
                        "flex w-full items-center justify-center gap-2 rounded-full py-2 font-gabarito-bold text-sm text-white transition sm:text-base",
                        jaLeuHoje ? "cursor-not-allowed bg-gray-400 opacity-75" : "bg-azul-600 hover:bg-azul-700",
                    )}
                >
                    {jaLeuHoje ? (
                        "Leitura registrada hoje"
                    ) : (
                        <>
                            <Plus className="h-4 w-4" />
                            Registrar leitura
                        </>
                    )}
                </button>
            </Box>

            <RegistrarLeituraModal open={modalAberto} onClose={() => setModalAberto(false)} />

            <Box className="flex w-full min-w-0 flex-col gap-2 p-3 lg:gap-2.5 lg:p-4">
                <h2 className="font-gabarito-bold text-lg text-azul-900 sm:text-2xl lg:text-4xl">Ajuda</h2>
                <div className="flex flex-col gap-1 sm:gap-1.5 lg:gap-2.5">
                    {linksAjuda.map((rotulo) => (
                        <Link
                            key={rotulo}
                            href="/"
                            className="font-gabarito-bold text-sm text-azul-700 transition-colors hover:text-azul-600 sm:text-base lg:text-xl"
                        >
                            {rotulo}
                        </Link>
                    ))}
                </div>
            </Box>
        </section>
    );
}
