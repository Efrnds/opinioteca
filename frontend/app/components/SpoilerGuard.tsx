"use client";

import { type ReactNode, useEffect, useState } from "react";

type SpoilerGuardProps = {
    ativo: boolean;
    children: ReactNode;
    mensagem?: string;
};

export default function SpoilerGuard({ ativo, children, mensagem }: SpoilerGuardProps) {
    const [revelado, setRevelado] = useState(false);

    useEffect(() => {
        if (ativo) setRevelado(false);
    }, [ativo]);

    if (!ativo || revelado) {
        return <>{children}</>;
    }

    return (
        <div className="relative min-h-[8rem] overflow-hidden rounded-xl">
            <div className="pointer-events-none select-none blur-lg brightness-75" aria-hidden="true">
                {children}
            </div>
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-azul-900/75 p-6 text-center backdrop-blur-sm">
                <span className="rounded-full bg-amber-400/90 px-3 py-0.5 font-gabarito-bold text-[11px] uppercase tracking-wide text-azul-900">
                    Spoiler
                </span>
                <p className="font-gabarito-bold text-sm text-white">
                    {mensagem ?? "Esta avaliação contém spoiler"}
                </p>
                <p className="max-w-xs font-gabarito-regular text-xs text-white/80">
                    O conteúdo está oculto para não estragar sua leitura.
                </p>
                <button
                    type="button"
                    onClick={() => setRevelado(true)}
                    aria-label="Revelar conteúdo com spoiler"
                    className="rounded-full bg-white px-5 py-2.5 font-gabarito-bold text-sm text-azul-900 shadow-md transition hover:bg-azul-50"
                >
                    Ver mesmo assim
                </button>
            </div>
        </div>
    );
}
