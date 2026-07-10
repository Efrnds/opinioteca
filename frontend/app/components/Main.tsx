"use client";

import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import AvisoAssinaturaExpirando from "./AvisoAssinaturaExpirando";
import MenuDireito from "./MenuDireito";
import MenuEsquerdo from "./MenuEsquerdo";
import NovaResenhaFlutuante from "./NovaResenhaFlutuante";
import StreakFlutuante from "./StreakFlutuante";
import { usePlano } from "./PlanoProvider";

function esconderMenuDireito(pathname: string) {
    return (
        pathname.startsWith("/mensagens") ||
        pathname.startsWith("/configuracoes")
    );
}

export default function Main({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isMensagens = pathname.startsWith("/mensagens");
    const isConfiguracoes = pathname.startsWith("/configuracoes");
    const isAdmin = pathname.startsWith("/admin");
    const mostrarMenuDireito = !esconderMenuDireito(pathname);
    const mostrarAvisoAssinatura = !isMensagens && !isAdmin && !isConfiguracoes;
    const { modoZen } = usePlano();

    // Fixed viewport height + overflow on the aside → one scrollbar; children can flex-fill
    const sidebarClass =
        "layout-sidebar sticky top-16 hidden h-[calc(100dvh-4rem)] max-h-[calc(100dvh-4rem)] shrink-0 flex-col overflow-y-auto overscroll-contain py-3 lg:flex lg:w-56 xl:w-64 xl:py-4 2xl:w-72";

    return (
        <main
            className={cn(
                // gap === px at each step → equal gutters between columns and page edges
                "flex min-w-0 flex-1 gap-2 px-2 sm:gap-3 sm:px-3 lg:gap-4 lg:px-4 xl:gap-6 xl:px-6 2xl:gap-8 2xl:px-8",
                isMensagens && "h-[calc(100dvh-4rem)] min-h-0 overflow-hidden",
            )}
        >
            <aside className={sidebarClass}>
                <MenuEsquerdo />
            </aside>

            <section
                className={cn(
                    "min-w-0 flex-1 px-0 py-3 sm:py-4 lg:py-5",
                    // Clear fixed FABs on mobile / tablet (< lg)
                    !isMensagens && "pb-20 lg:pb-5",
                    isMensagens && "flex min-h-0 flex-col overflow-hidden py-2 sm:py-3 lg:py-3",
                )}
            >
                <div
                    className={cn(
                        "mx-auto flex w-full min-w-0 flex-col gap-3 sm:gap-4",
                        isMensagens && "h-full min-h-0",
                        !isMensagens && !isConfiguracoes && "max-w-2xl xl:max-w-3xl",
                        isConfiguracoes && "max-w-5xl xl:max-w-6xl 2xl:max-w-7xl",
                    )}
                >
                    {mostrarAvisoAssinatura ? <AvisoAssinaturaExpirando /> : null}
                    {children}
                </div>
            </section>

            {mostrarMenuDireito ? (
                <aside className={cn(sidebarClass, "min-w-0")}>
                    <MenuDireito />
                </aside>
            ) : null}

            {!isMensagens && !modoZen ? <StreakFlutuante /> : null}
            {!isMensagens && !modoZen ? <NovaResenhaFlutuante /> : null}
        </main>
    );
}
