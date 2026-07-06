"use client";

import { useDiario } from "@/lib/hooks/useDiario";
import { cn } from "@/lib/utils";
import { Book, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import Box from "./Box";
import RegistrarLeituraModal from "./RegistrarLeituraModal";

const linksAjuda = ["Tem nos campi?", "Opção 2", "Opção 3"];

export default function MenuDireito() {
    const { carregando, sequencia, streak, jaLeuHoje, diaHoje } = useDiario();
    const [modalAberto, setModalAberto] = useState(false);

    return (
        <section className="flex h-full w-full min-w-0 flex-col justify-between gap-11 overflow-hidden">
            <Box className="flex w-full min-w-0 flex-col gap-2.5 p-4">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <h2 className="font-gabarito-bold text-xl leading-tight text-azul-900">Como está a semana?</h2>
                        <p className="mt-0.5 font-gabarito-regular text-base text-cinza-700">
                            Dias com histórico de leitura
                        </p>
                    </div>
                    <p
                        className={cn(
                            "shrink-0 font-gabarito-bold text-xl",
                            carregando || streak > 0 ? "text-[#ed2d00]" : "text-cinza-500",
                        )}
                    >
                        {carregando ? "…" : streak}{" "}
                        <span className={cn("text-2xl", streak === 0 && !carregando && "grayscale")}>🔥</span>
                    </p>
                </div>

                <div className="grid w-full min-w-0 grid-cols-7 gap-2.5">
                    {Array.from({ length: 7 }, (_, index) => {
                        const item = sequencia[index];
                        const leu = !carregando && !!item?.leu;
                        const hoje = !carregando && index === diaHoje;
                        const dia = item?.dia ?? ["D", "S", "T", "Q", "Q", "S", "S"][index];

                        return (
                            <div key={index} className="flex min-w-0 flex-col items-center gap-1.5">
                                <div
                                    className={cn(
                                        "flex aspect-square w-full max-w-10 items-center justify-center rounded-full",
                                        carregando ? "animate-pulse bg-azul-200" : leu ? "bg-azul-800" : "bg-azul-200",
                                        hoje && "ring-2 ring-azul-600 ring-offset-1",
                                    )}
                                >
                                    {!carregando && (
                                        <Book className={cn("h-5 w-5", leu ? "text-azul-200" : "text-azul-400")} />
                                    )}
                                </div>
                                <p
                                    className={cn(
                                        "font-gabarito-bold text-xl",
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
                        "flex w-full items-center justify-center gap-2 rounded-full py-2 font-gabarito-bold text-base text-white transition",
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

            <Box className="flex w-full min-w-0 flex-col gap-2.5 p-4">
                <h2 className="font-gabarito-bold text-4xl text-azul-900">Ajuda</h2>
                <div className="flex flex-col gap-2.5">
                    {linksAjuda.map((rotulo) => (
                        <Link
                            key={rotulo}
                            href="/"
                            className="font-gabarito-bold text-xl text-azul-700 transition-colors hover:text-azul-600"
                        >
                            {rotulo}
                        </Link>
                    ))}
                </div>
            </Box>
        </section>
    );
}
