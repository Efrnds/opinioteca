"use client";

import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import AuthLoadingScreen from "./AuthLoadingScreen";
import GuestPublicChrome from "./GuestPublicChrome";
import LayoutShell from "./LayoutShell";
import { useAuthTransition } from "./AuthTransitionProvider";

const rotasGuestComChrome = ["/livros", "/perfil", "/avaliacoes", "/termos", "/privacidade"];

function ehRotaGuestComChrome(pathname: string) {
    return rotasGuestComChrome.some(
        (prefixo) => pathname === prefixo || pathname.startsWith(`${prefixo}/`),
    );
}

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { status } = useSession();
    const { isAuthTransitioning, endAuthTransition } = useAuthTransition();

    const isLandingRoute = pathname === "/";
    const showLoadingScreen =
        status === "loading" || isAuthTransitioning || (status === "authenticated" && isLandingRoute);

    useEffect(() => {
        const body = document.body;
        if (status === "authenticated" && !isLandingRoute) {
            body.classList.add("min-h-dvh", "w-full");
        } else {
            body.classList.remove("min-h-dvh", "w-full");
        }

        return () => {
            body.classList.remove("min-h-dvh", "w-full");
        };
    }, [status, isLandingRoute]);

    useEffect(() => {
        if (status !== "authenticated" || !isLandingRoute) {
            return;
        }

        const params = new URLSearchParams(window.location.search);
        const callbackUrl = params.get("callbackUrl") ?? "/home";
        router.replace(callbackUrl);
    }, [status, isLandingRoute, router]);

    useEffect(() => {
        if (isAuthTransitioning && status === "authenticated" && !isLandingRoute) {
            endAuthTransition();
        }
    }, [isAuthTransitioning, status, isLandingRoute, endAuthTransition]);

    if (showLoadingScreen) {
        return <AuthLoadingScreen />;
    }

    if (status === "authenticated") {
        return <LayoutShell>{children}</LayoutShell>;
    }

    if (ehRotaGuestComChrome(pathname)) {
        return <GuestPublicChrome>{children}</GuestPublicChrome>;
    }

    return <>{children}</>;
}
