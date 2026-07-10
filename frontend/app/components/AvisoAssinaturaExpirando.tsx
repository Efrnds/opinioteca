"use client";

import { URL_UPGRADE_PLANO } from "@/lib/plano";
import { infoAssinaturaExpirando } from "@/types/plano";
import { AlertTriangle, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePlano } from "./PlanoProvider";

function chaveDismiss(expiraEm: string) {
    return `aviso-assinatura-expira:${expiraEm}`;
}

type AvisoAssinaturaExpirandoProps = {
    /** Se true, permite fechar o aviso na sessão (sessionStorage). */
    dismissivel?: boolean;
    /** Variante compacta para Configurações (sem botão fechar por padrão). */
    variante?: "banner" | "nota";
};

export default function AvisoAssinaturaExpirando({
    dismissivel = true,
    variante = "banner",
}: AvisoAssinaturaExpirandoProps) {
    const { plano } = usePlano();
    const info = infoAssinaturaExpirando(plano);
    const [oculto, setOculto] = useState(false);

    useEffect(() => {
        if (!dismissivel || !plano?.assinaturaExpiraEm || !info) {
            setOculto(false);
            return;
        }
        try {
            setOculto(sessionStorage.getItem(chaveDismiss(plano.assinaturaExpiraEm)) === "1");
        } catch {
            setOculto(false);
        }
    }, [dismissivel, info, plano?.assinaturaExpiraEm]);

    if (!info || oculto) return null;

    const dispensar = () => {
        if (!dismissivel || !plano?.assinaturaExpiraEm) return;
        try {
            sessionStorage.setItem(chaveDismiss(plano.assinaturaExpiraEm), "1");
        } catch {
            /* ignore */
        }
        setOculto(true);
    };

    if (variante === "nota") {
        return (
            <div
                role="status"
                className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3"
            >
                <p className="font-gabarito-medium text-sm text-amber-900">{info.mensagem}</p>
                <p className="mt-1 font-gabarito-regular text-xs text-amber-800">
                    Renove a tempo para manter os benefícios do seu plano.
                </p>
            </div>
        );
    }

    return (
        <div
            role="status"
            className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3"
        >
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden />
            <div className="min-w-0 flex-1">
                <p className="font-gabarito-medium text-sm text-amber-900">{info.mensagem}</p>
                <Link
                    href={URL_UPGRADE_PLANO}
                    className="mt-1 inline-block font-gabarito-medium text-xs text-azul-700 underline-offset-2 hover:underline"
                >
                    Ver plano e assinatura
                </Link>
            </div>
            {dismissivel ? (
                <button
                    type="button"
                    onClick={dispensar}
                    className="shrink-0 rounded-full p-1 text-amber-800 transition hover:bg-amber-100"
                    aria-label="Dispensar aviso"
                >
                    <X className="h-4 w-4" />
                </button>
            ) : null}
        </div>
    );
}
