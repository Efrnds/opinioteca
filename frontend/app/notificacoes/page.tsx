"use client";

import { CheckCheck, ChevronLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import Box from "../components/Box";
import NotificacoesLista from "../components/NotificacoesLista";
import { useWebSocket } from "../components/WebSocketProvider";

export default function NotificacoesPage() {
    const { contagemNaoLidas, marcarTodasNotificacoesLidas } = useWebSocket();
    const [marcando, setMarcando] = useState(false);

    async function marcarTudo() {
        if (marcando || contagemNaoLidas === 0) return;
        setMarcando(true);
        try {
            await marcarTodasNotificacoesLidas();
        } finally {
            setMarcando(false);
        }
    }

    return (
        <Box className="flex flex-col gap-0 p-0">
            <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-4 sm:px-6 sm:pt-6">
                <Link
                    href="/home"
                    className="inline-flex items-center gap-1 font-gabarito-bold text-xl text-azul-900 transition hover:text-azul-600"
                >
                    <ChevronLeft className="h-6 w-6" />
                    Notificações
                </Link>
                <button
                    type="button"
                    onClick={() => void marcarTudo()}
                    disabled={marcando || contagemNaoLidas === 0}
                    title="Marcar tudo como lido"
                    aria-label="Marcar tudo como lido"
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-1.5 font-gabarito-medium text-sm text-azul-600 transition hover:bg-azul-50 hover:text-azul-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {marcando ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <CheckCheck className="h-4 w-4" />
                    )}
                    <span className="hidden sm:inline">Marcar tudo como lido</span>
                </button>
            </div>
            <hr className="border-gray-300" />
            <div className="px-4 py-4 sm:px-6 sm:py-5">
                <NotificacoesLista />
            </div>
        </Box>
    );
}
