"use client";

import { cn } from "@/lib/utils";
import { Bell, Home, LogOut, Mail, MoreHorizontal, Plus, Settings, User, type LucideIcon } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Box from "./Box";
import NovaAvaliacaoModal from "./NovaAvaliacaoModal";
import { useWebSocket } from "./WebSocketProvider";

type ItemMenu = {
    href: string;
    rotulo: string;
    icone: LucideIcon;
};

const itensMenu: ItemMenu[] = [
    { href: "/home", rotulo: "Home", icone: Home },
    { href: "/mensagens", rotulo: "Mensagens", icone: Mail },
    { href: "/notificacoes", rotulo: "Notificações", icone: Bell },
    { href: "/perfil", rotulo: "Perfil", icone: User },
    { href: "/configuracoes", rotulo: "Configurações", icone: Settings },
];

function itemAtivo(pathname: string, href: string) {
    if (href === "/home") {
        return pathname === "/home";
    }
    return pathname === href || pathname.startsWith(`${href}/`);
}

export default function MenuEsquerdo() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const { contagemNaoLidas } = useWebSocket();
    const [modalAberto, setModalAberto] = useState(false);
    const [menuContaAberto, setMenuContaAberto] = useState(false);

    const nick = session?.user?.nick ?? "Usuário";

    async function handleSignOut() {
        await signOut({ callbackUrl: "/" });
    }

    return (
        <section className="flex h-full w-full flex-col gap-4 overflow-hidden lg:gap-11">
            <Box className="flex h-full w-full flex-col items-center justify-between gap-6 rounded-bl-none rounded-tl-none lg:items-start lg:rounded-bl-2xl lg:rounded-tl-2xl xl:gap-8">
                <div className="flex w-full flex-col items-center gap-6 lg:items-start lg:gap-8">
                    <h1 className="hidden font-gabarito-bold text-4xl text-azul-900 lg:block">Menu</h1>
                    <nav className="flex w-full flex-col items-center gap-6 lg:items-start lg:gap-8">
                        {itensMenu.map(({ href, rotulo, icone: Icone }) => {
                            const ativo = itemAtivo(pathname, href);
                            return (
                                <Link
                                    key={href}
                                    href={href}
                                    className={cn(
                                        "flex w-fit items-center gap-2 rounded-xl px-2 py-1 transition-colors lg:w-full lg:px-0",
                                        ativo ? "text-azul-600" : "text-azul-900 hover:text-azul-600",
                                    )}
                                    aria-current={ativo ? "page" : undefined}
                                >
                                    <span className="relative shrink-0">
                                        <Icone className="h-6 w-6" strokeWidth={ativo ? 2.5 : 2} />
                                        {href === "/notificacoes" && contagemNaoLidas > 0 && (
                                            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white">
                                                {contagemNaoLidas > 9 ? "9+" : contagemNaoLidas}
                                            </span>
                                        )}
                                    </span>
                                    <span className="hidden font-gabarito-bold text-xl lg:inline">{rotulo}</span>
                                </Link>
                            );
                        })}
                    </nav>
                </div>
                <button
                    type="button"
                    onClick={() => setModalAberto(true)}
                    aria-label="Nova Resenha"
                    className="flex aspect-square w-10 shrink-0 items-center justify-center rounded-full bg-azul-600 text-white transition hover:bg-azul-700 xl:aspect-auto xl:w-full xl:py-2"
                >
                    <Plus className="h-6 w-6 xl:hidden" />
                    <span className="hidden font-gabarito-bold text-xl xl:inline">Nova Resenha</span>
                </button>
            </Box>

            <NovaAvaliacaoModal open={modalAberto} onClose={() => setModalAberto(false)} />

            <Box className="flex w-full items-center justify-between gap-2 rounded-bl-none rounded-tl-none p-3 lg:rounded-bl-2xl lg:rounded-tl-2xl lg:p-4">
                <Link href="/perfil" className="flex min-w-0 items-center gap-2">
                    {session?.user?.image ? (
                        <Image
                            src={session.user.image}
                            alt="Avatar"
                            width={49}
                            height={49}
                            className="aspect-square h-10 w-10 shrink-0 rounded-full object-cover lg:h-12 lg:w-12"
                        />
                    ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-200 font-gabarito-bold text-xl text-azul-900 lg:h-12 lg:w-12 lg:text-2xl">
                            {nick.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <span className="hidden truncate font-gabarito-bold text-xl text-azul-900 lg:inline">{nick}</span>
                </Link>
                <div className="relative flex shrink-0 items-center gap-1">
                    <button
                        type="button"
                        onClick={() => setMenuContaAberto((v) => !v)}
                        className="hidden rounded-full p-2 transition hover:bg-gray-100 lg:flex"
                        aria-label="Mais opções"
                    >
                        <MoreHorizontal className="h-6 w-6 text-azul-900" />
                    </button>
                    {menuContaAberto && (
                        <div className="absolute bottom-full right-0 z-20 mb-2 min-w-40 rounded-xl border border-gray-200 bg-white p-1 shadow-lg">
                            <button
                                type="button"
                                onClick={handleSignOut}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 font-gabarito-bold text-sm text-red-600 transition hover:bg-background"
                            >
                                <LogOut className="h-4 w-4" />
                                Sair
                            </button>
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={handleSignOut}
                        className="rounded-full p-2 transition hover:bg-gray-100 lg:hidden"
                        aria-label="Sair"
                    >
                        <LogOut className="h-5 w-5 text-red-600" />
                    </button>
                </div>
            </Box>
        </section>
    );
}
