"use client";

import { itemAtivo, itensMenu } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { LogOut, MoreHorizontal } from "lucide-react";
import { encerrarSessaoCompleta } from "@/lib/session-cleanup";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import AvatarUsuario from "./AvatarUsuario";
import Box from "./Box";
import NovaAvaliacaoModal from "./NovaAvaliacaoModal";
import { useWebSocket } from "./WebSocketProvider";

export default function MenuEsquerdo() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const { contagemNaoLidas, mensagensNaoLidasTotal } = useWebSocket();
    const [modalAberto, setModalAberto] = useState(false);
    const [menuContaAberto, setMenuContaAberto] = useState(false);
    const contaRef = useRef<HTMLDivElement>(null);

    const nick = session?.user?.nick ?? "Usuário";

    async function handleSignOut() {
        await encerrarSessaoCompleta("/");
    }

    useEffect(() => {
        if (!menuContaAberto) {
            return;
        }

        function handleClickFora(e: MouseEvent) {
            if (contaRef.current && !contaRef.current.contains(e.target as Node)) {
                setMenuContaAberto(false);
            }
        }

        document.addEventListener("mousedown", handleClickFora);
        return () => document.removeEventListener("mousedown", handleClickFora);
    }, [menuContaAberto]);

    return (
        <section className="flex min-h-0 w-full flex-1 flex-col gap-3">
            <Box className="flex min-h-0 flex-1 flex-col gap-3 !p-3 xl:gap-4 xl:!p-4">
                <h1 className="shrink-0 font-gabarito-bold text-xl text-azul-900 xl:text-2xl">Menu</h1>

                <nav className="flex min-h-0 flex-1 flex-col items-start gap-2.5 xl:gap-3">
                    {itensMenu.map(({ href, rotulo, icone: Icone }) => {
                        const ativo = itemAtivo(pathname, href);
                        return (
                            <Link
                                key={href}
                                href={href}
                                className={cn(
                                    "flex w-full items-center gap-2 rounded-xl transition-colors",
                                    ativo ? "text-azul-600" : "text-azul-900 hover:text-azul-600",
                                )}
                                aria-current={ativo ? "page" : undefined}
                            >
                                <span className="relative shrink-0">
                                    <Icone className="h-5 w-5 xl:h-6 xl:w-6" strokeWidth={ativo ? 2.5 : 2} />
                                    {href === "/notificacoes" && contagemNaoLidas > 0 && (
                                        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white">
                                            {contagemNaoLidas > 9 ? "9+" : contagemNaoLidas}
                                        </span>
                                    )}
                                    {href === "/mensagens" && mensagensNaoLidasTotal > 0 && (
                                        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white">
                                            {mensagensNaoLidasTotal > 9 ? "9+" : mensagensNaoLidasTotal}
                                        </span>
                                    )}
                                </span>
                                <span className="truncate font-gabarito-bold text-base xl:text-lg">{rotulo}</span>
                            </Link>
                        );
                    })}
                </nav>

                <button
                    type="button"
                    onClick={() => setModalAberto(true)}
                    aria-label="Nova Avaliação"
                    className="flex w-full shrink-0 items-center justify-center rounded-full bg-azul-600 py-2 text-azul-600-foreground transition hover:bg-azul-700"
                >
                    <span className="font-gabarito-bold text-base xl:text-lg">Nova Avaliação</span>
                </button>
            </Box>

            <NovaAvaliacaoModal open={modalAberto} onClose={() => setModalAberto(false)} />

            <Box ref={contaRef} className="relative flex w-full shrink-0 items-center justify-between gap-2 !p-2.5 xl:!p-3">
                <Link href="/perfil" className="flex min-w-0 items-center gap-2">
                    <AvatarUsuario
                        image={session?.user?.image}
                        nome={session?.user?.name ?? undefined}
                        nick={nick}
                        size={44}
                        className="h-10 w-10 xl:h-11 xl:w-11"
                    />
                    <span className="truncate font-gabarito-bold text-base text-azul-900 xl:text-lg">{nick}</span>
                </Link>

                <button
                    type="button"
                    onClick={() => setMenuContaAberto((v) => !v)}
                    className="shrink-0 rounded-full p-2 transition hover:bg-gray-100"
                    aria-label="Mais opções"
                >
                    <MoreHorizontal className="h-6 w-6 text-azul-900" />
                </button>

                <AnimatePresence>
                    {menuContaAberto && (
                        <motion.div
                            key="menu-conta-dropdown"
                            initial={{ opacity: 0, y: 6, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 6, scale: 0.97 }}
                            transition={{ duration: 0.15, ease: "easeOut" }}
                            className="absolute bottom-full right-4 z-20 mb-2 w-40 origin-bottom-right rounded-xl border border-gray-200 bg-white p-1 shadow-lg"
                        >
                            <button
                                type="button"
                                onClick={handleSignOut}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 font-gabarito-bold text-sm text-red-600 transition hover:bg-background"
                            >
                                <LogOut className="h-4 w-4" />
                                Sair
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Box>
        </section>
    );
}
