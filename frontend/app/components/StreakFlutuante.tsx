"use client";

import { useDiario } from "@/lib/hooks/useDiario";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useConfiguracoes } from "./ConfiguracoesProvider";
import RegistrarLeituraModal from "./RegistrarLeituraModal";

export default function StreakFlutuante() {
    const { carregando, streak } = useDiario();
    const { config } = useConfiguracoes();
    const [modalAberto, setModalAberto] = useState(false);

    if (!config.mostrarStreak) {
        return null;
    }

    return (
        <>
            <button
                type="button"
                onClick={() => setModalAberto(true)}
                aria-label="Registrar leitura de hoje"
                className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-3 z-30 flex items-center gap-1.5 rounded-full bg-white py-1.5 pl-3 pr-1.5 shadow-lg ring-1 ring-black/10 transition active:scale-95 hover:brightness-110 lg:hidden"
            >
                <span
                    className={cn(
                        "font-gabarito-bold text-sm",
                        carregando || streak > 0 ? "text-[#ed2d00]" : "text-cinza-500",
                    )}
                >
                    {carregando ? "…" : streak}
                </span>
                <span
                    className={cn(
                        "text-base leading-none",
                        streak === 0 && !carregando && "grayscale",
                    )}
                >
                    🔥
                </span>
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-azul-600 text-white">
                    <Plus className="h-4 w-4" />
                </span>
            </button>

            <RegistrarLeituraModal open={modalAberto} onClose={() => setModalAberto(false)} />
        </>
    );
}
