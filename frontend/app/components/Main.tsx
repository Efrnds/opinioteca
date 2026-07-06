"use client";

import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import MenuDireito from "./MenuDireito";
import MenuEsquerdo from "./MenuEsquerdo";
import NovaResenhaFlutuante from "./NovaResenhaFlutuante";
import StreakFlutuante from "./StreakFlutuante";

export default function Main({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isMensagens = pathname.startsWith("/mensagens");

    return (
        <main className="flex h-[calc(100dvh-73px)] overflow-hidden gap-2 sm:gap-4 lg:h-[calc(100vh-96px)] lg:gap-8 lg:px-12 xl:gap-10 xl:px-24">
            <aside className="hidden shrink-0 flex-col overflow-hidden py-10 lg:flex lg:w-[min(20%,280px)]">
                <MenuEsquerdo />
            </aside>

            <section
                className={cn(
                    "min-h-0 min-w-0 flex-1 px-2 py-4 sm:px-4 lg:px-0 lg:py-10",
                    isMensagens ? "overflow-hidden" : "overflow-y-auto scrollbar-thin",
                )}
            >
                <div
                    className={cn(
                        "mx-auto flex h-full w-full flex-col gap-4",
                        !isMensagens && "max-w-2xl",
                    )}
                >
                    {children}
                </div>
            </section>

            {!isMensagens && (
                <>
                    <aside className="hidden shrink-0 flex-col overflow-hidden py-10 lg:flex lg:w-[min(20%,280px)]">
                        <MenuDireito />
                    </aside>
                    <StreakFlutuante />
                    <NovaResenhaFlutuante />
                </>
            )}
        </main>
    );
}
