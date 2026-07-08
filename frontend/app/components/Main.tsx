"use client";

import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
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
    const mostrarMenuDireito = !esconderMenuDireito(pathname);
    const { modoZen } = usePlano();

    const sidebarClass =
        "sticky top-[4.5rem] hidden h-[calc(100dvh-4.5rem)] shrink-0 flex-col py-4 lg:flex lg:w-56 xl:w-64 xl:py-6";

    return (
        <main
            className={cn(
                "flex flex-1 gap-3 px-2 sm:gap-4 sm:px-4 lg:gap-6 lg:px-6 xl:gap-8 xl:px-10",
                isMensagens && "min-h-0 overflow-hidden lg:h-[calc(100dvh-4.5rem)]",
            )}
        >
            <aside className={sidebarClass}>
                <MenuEsquerdo />
            </aside>

            <section
                className={cn(
                    "min-w-0 flex-1 px-0 py-4 lg:py-6",
                    isMensagens && "min-h-0 overflow-hidden",
                )}
            >
                <div
                    className={cn(
                        "mx-auto flex w-full flex-col gap-4",
                        isMensagens && "h-full",
                        !isMensagens && !isConfiguracoes && "max-w-2xl",
                        isConfiguracoes && "max-w-4xl",
                    )}
                >
                    {children}
                </div>
            </section>

            {mostrarMenuDireito ? (
                <aside className={sidebarClass}>
                    <MenuDireito />
                </aside>
            ) : null}

            {!isMensagens && !modoZen ? <StreakFlutuante /> : null}
            {!isMensagens && !modoZen ? <NovaResenhaFlutuante /> : null}
        </main>
    );
}
