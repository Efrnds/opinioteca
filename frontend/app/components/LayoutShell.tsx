"use client";

import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import Header from "./Header";
import Main from "./Main";

export default function LayoutShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isAdmin = pathname.startsWith("/admin");
    const isMensagens = pathname.startsWith("/mensagens");

    if (isAdmin) {
        return <>{children}</>;
    }

    return (
        <div
            className={cn(
                "flex min-w-0 flex-col overflow-x-clip",
                // Chat must lock to the viewport so the thread scrolls inside, not the page
                isMensagens ? "h-dvh overflow-hidden" : "min-h-dvh",
            )}
        >
            <Header />
            <Main>{children}</Main>
        </div>
    );
}
