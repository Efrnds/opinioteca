"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export type OpcaoPilula<T extends string> = {
    valor: T;
    rotulo: ReactNode;
};

type SeletorPilulaProps<T extends string> = {
    opcoes: OpcaoPilula<T>[];
    valor: T;
    onChange: (valor: T) => void;
    className?: string;
};

export default function SeletorPilula<T extends string>({
    opcoes,
    valor,
    onChange,
    className,
}: SeletorPilulaProps<T>) {
    return (
        <div className={cn("flex rounded-2xl bg-superficie p-1 shadow-sm ring-1 ring-black/5", className)}>
            {opcoes.map(({ valor: opcaoValor, rotulo }) => (
                <button
                    key={opcaoValor}
                    type="button"
                    onClick={() => onChange(opcaoValor)}
                    className={cn(
                        "flex-1 rounded-xl px-2 py-2 font-gabarito-bold text-xs transition sm:px-4 sm:py-2.5 sm:text-sm",
                        valor === opcaoValor
                            ? "bg-azul-600 text-white shadow-sm"
                            : "text-cinza-700 hover:bg-muted hover:text-azul-900",
                    )}
                >
                    {rotulo}
                </button>
            ))}
        </div>
    );
}
