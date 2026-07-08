"use client";

import { usePathname } from "next/navigation";
import Header from "./Header";
import Main from "./Main";

export default function LayoutShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isAdmin = pathname.startsWith("/admin");

    if (isAdmin) {
        return <>{children}</>;
    }

    return (
        <div className="flex min-h-dvh flex-col">
            <Header />
            <Main>{children}</Main>
        </div>
    );
}
