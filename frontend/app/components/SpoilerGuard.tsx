"use client";

import { type ReactNode, useState } from "react";

type SpoilerGuardProps = {
    ativo: boolean;
    children: ReactNode;
};

export default function SpoilerGuard({ ativo, children }: SpoilerGuardProps) {
    const [revelado, setRevelado] = useState(false);

    if (!ativo || revelado) {
        return <>{children}</>;
    }

    return (
        <div className="relative overflow-hidden rounded-xl">
            <div className="pointer-events-none select-none blur-md" aria-hidden="true">
                {children}
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/55 p-4 text-center">
                <p className="font-gabarito-bold text-sm text-white">Esta avaliação contém spoiler</p>
                <button
                    type="button"
                    onClick={() => setRevelado(true)}
                    aria-label="Revelar conteúdo com spoiler"
                    className="rounded-full bg-white px-4 py-2 font-gabarito-bold text-sm text-azul-900 transition hover:bg-azul-50"
                >
                    Ver mesmo assim
                </button>
            </div>
        </div>
    );
}
