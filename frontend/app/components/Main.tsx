"use client";

import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import AvisoAssinaturaExpirando from "./AvisoAssinaturaExpirando";
import MenuDireito from "./MenuDireito";
import MenuEsquerdo from "./MenuEsquerdo";
import NovaAvaliacaoFlutuante from "./NovaAvaliacaoFlutuante";
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

    const sidebarClass =
        "sticky top-[var(--layout-sticky-top)] hidden h-[calc(100dvh-var(--layout-sticky-top))] max-h-[calc(100dvh-var(--layout-sticky-top))] shrink-0 flex-col overflow-y-auto overscroll-contain lg:flex lg:w-56 lg:pt-3 lg:pb-3 xl:w-64 xl:pt-4 xl:pb-4 2xl:w-72";

    return (
        <main
            className={cn(
                "flex min-w-0 flex-1 gap-2 px-2 sm:gap-3 sm:px-3 lg:gap-4 lg:px-4 xl:gap-6 xl:px-6 2xl:gap-8 2xl:px-8",
                isMensagens && "min-h-0 overflow-hidden",
            )}
        >
            <aside className={sidebarClass}>
                <MenuEsquerdo />
            </aside>

            <section
                className={cn(
                    "min-w-0 flex-1 px-0 py-3 sm:py-4 lg:pt-3 lg:pb-5 xl:pt-4",
                    // Clear fixed FABs on mobile / tablet (< lg)
                    !isMensagens && "pb-20 lg:pb-5",
                    // flex-1 child + min-h-0 (not h-full) so py does not clip the composer
                    isMensagens && "flex min-h-0 flex-col overflow-hidden py-2",
                )}
            >
                <div
                    className={cn(
                        "mx-auto flex w-full min-w-0 flex-col gap-3 sm:gap-4",
                        isMensagens && "min-h-0 flex-1 gap-0 overflow-hidden",
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
            {!isMensagens && !modoZen ? <NovaAvaliacaoFlutuante /> : null}
        </main>
    );
}
