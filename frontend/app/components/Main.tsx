"use client";

import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import MenuDireito from "./MenuDireito";
import MenuEsquerdo from "./MenuEsquerdo";

export default function Main({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isMensagens = pathname.startsWith("/mensagens");

    return (
        <main className="flex h-[calc(100dvh-73px)] overflow-hidden px-2 sm:px-4 lg:h-[calc(100vh-96px)] lg:px-12 xl:px-24 gap-2 sm:gap-4 lg:gap-8 xl:gap-10">
            <aside className="flex w-14 shrink-0 flex-col overflow-hidden py-4 sm:w-16 lg:w-[min(20%,280px)] lg:py-10">
                <MenuEsquerdo />
            </aside>

            <section
                className={cn(
                    "min-h-0 min-w-0 flex-1 py-4 lg:py-10",
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
                <aside className="flex w-18 shrink-0 flex-col overflow-hidden py-4 sm:w-20 md:w-24 lg:w-[min(20%,280px)] lg:py-10">
                    <MenuDireito />
                </aside>
            )}
        </main>
    );
}
