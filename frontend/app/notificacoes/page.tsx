"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import Box from "../components/Box";
import NotificacoesLista from "../components/NotificacoesLista";

export default function NotificacoesPage() {
    return (
        <Box className="flex h-full min-h-0 flex-col gap-0 overflow-hidden p-0">
            <div className="shrink-0 px-4 pb-3 pt-4 sm:px-6 sm:pt-6">
                <Link
                    href="/home"
                    className="inline-flex items-center gap-1 font-gabarito-bold text-xl text-azul-900 transition hover:text-azul-600"
                >
                    <ChevronLeft className="h-6 w-6" />
                    Notificações
                </Link>
            </div>
            <hr className="shrink-0 border-gray-300" />
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
                <NotificacoesLista />
            </div>
        </Box>
    );
}
