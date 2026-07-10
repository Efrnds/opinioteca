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

    // max-h + overflow on the aside (not nested boxes) → at most one scrollbar per column
    const sidebarClass =
        "layout-sidebar sticky top-16 hidden max-h-[calc(100dvh-4rem)] shrink-0 flex-col overflow-y-auto overscroll-contain py-3 lg:flex lg:w-52 xl:w-64 xl:py-4";

    return (
        <main
            className={cn(
                "flex min-w-0 flex-1 gap-2 px-2 sm:gap-3 sm:px-3 lg:gap-4 lg:px-4 xl:gap-6 xl:px-8",
                isMensagens && "min-h-0 overflow-hidden lg:h-[calc(100dvh-4rem)]",
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
                    isMensagens && "min-h-0 overflow-hidden",
                )}
            >
                <div
                    className={cn(
                        "mx-auto flex w-full min-w-0 flex-col gap-3 sm:gap-4",
                        isMensagens && "h-full",
                        !isMensagens && !isConfiguracoes && "max-w-2xl",
                        isConfiguracoes && "max-w-4xl",
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
