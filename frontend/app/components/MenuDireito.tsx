"use client";

import { useDiario } from "@/lib/hooks/useDiario";
import { cn } from "@/lib/utils";
import { Book, Plus } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Box from "./Box";
import { useConfiguracoes } from "./ConfiguracoesProvider";
import DescobertaSecoes from "./DescobertaSecoes";
import RegistrarLeituraModal from "./RegistrarLeituraModal";
import { usePlano } from "./PlanoProvider";

export default function MenuDireito() {
    const pathname = usePathname();
    const { carregando, sequencia, streak, jaLeuHoje, diaHoje } = useDiario();
    const { config } = useConfiguracoes();
    const { modoZen } = usePlano();
    const [modalAberto, setModalAberto] = useState(false);
    const mostrarStreak = config.mostrarStreak && !modoZen;
    // Evita duplicar as seções quando o conteúdo já está na coluna principal.
    const mostrarDescobertaLateral =
        !pathname.startsWith("/explorar") && !pathname.startsWith("/descoberta");

    return (
        <section className="flex w-full min-w-0 flex-col gap-3">
            {mostrarStreak ? (
                <Box className="flex w-full min-w-0 flex-col gap-2 !p-3">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <h2 className="font-gabarito-bold text-base leading-tight text-azul-900">
                                Como está a semana?
                            </h2>
                            <p className="mt-0.5 font-gabarito-regular text-xs text-cinza-700">
                                Dias com histórico de leitura
                            </p>
                        </div>
                        <p
                            className={cn(
                                "shrink-0 font-gabarito-bold text-base leading-none",
                                carregando || streak > 0 ? "text-[#ed2d00]" : "text-cinza-500",
                            )}
                        >
                            {carregando ? "…" : streak}{" "}
                            <span className={cn("text-lg", streak === 0 && !carregando && "grayscale")}>
                                🔥
                            </span>
                        </p>
                    </div>

                    <div className="grid w-full min-w-0 grid-cols-7 gap-1">
                        {Array.from({ length: 7 }, (_, index) => {
                            const item = sequencia[index];
                            const leu = !carregando && !!item?.leu;
                            const hoje = !carregando && index === diaHoje;
                            const dia = item?.dia ?? ["D", "S", "T", "Q", "Q", "S", "S"][index];

                            return (
                                <div key={index} className="flex min-w-0 flex-col items-center gap-0.5">
                                    <div
                                        className={cn(
                                            "flex aspect-square w-full max-w-8 items-center justify-center rounded-full",
                                            carregando
                                                ? "animate-pulse bg-azul-200"
                                                : leu
                                                  ? "bg-azul-800"
                                                  : "bg-azul-200",
                                            hoje && "ring-2 ring-azul-600 ring-offset-1",
                                        )}
                                    >
                                        {!carregando && (
                                            <Book
                                                className={cn(
                                                    "h-3.5 w-3.5",
                                                    leu ? "text-azul-200" : "text-azul-400",
                                                )}
                                            />
                                        )}
                                    </div>
                                    <p
                                        className={cn(
                                            "font-gabarito-bold text-xs",
                                            carregando
                                                ? "text-azul-400"
                                                : leu
                                                  ? "text-azul-800"
                                                  : "text-azul-400",
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
                            "flex w-full items-center justify-center gap-1.5 rounded-full py-1.5 font-gabarito-bold text-sm transition",
                            jaLeuHoje
                                ? "cursor-not-allowed bg-cinza-300 text-cinza-700 opacity-90"
                                : "bg-azul-600 text-azul-600-foreground hover:bg-azul-700",
                        )}
                    >
                        {jaLeuHoje ? (
                            "Leitura registrada hoje"
                        ) : (
                            <>
                                <Plus className="h-3.5 w-3.5" />
                                Registrar leitura
                            </>
                        )}
                    </button>
                </Box>
            ) : null}

            <RegistrarLeituraModal open={modalAberto} onClose={() => setModalAberto(false)} />

            {mostrarDescobertaLateral && !modoZen ? (
                <div className="min-w-0">
                    <DescobertaSecoes variante="lateral" mostrarTitulo />
                </div>
            ) : null}
        </section>
    );
}
