"use client";

import { destinoPosLogin, limparStorageCliente, purgeCookiesAuth } from "@/lib/session-cleanup";
import { signIn, signOut } from "next-auth/react";
import Image from "next/image";
import { useState } from "react";
import { useAuthTransition } from "./AuthTransitionProvider";

type BotaoGoogleAuthProps = {
    callbackUrl?: string;
    className?: string;
    /** Visual do botão na landing (grande) vs modal. */
    variante?: "landing" | "modal";
};

export default function BotaoGoogleAuth({
    callbackUrl,
    className = "",
    variante = "modal",
}: BotaoGoogleAuthProps) {
    const { startAuthTransition, endAuthTransition } = useAuthTransition();
    const [carregando, setCarregando] = useState(false);

    async function handleGoogle() {
        if (carregando) return;
        setCarregando(true);
        startAuthTransition();

        try {
            limparStorageCliente();
            try {
                await signOut({ redirect: false });
            } catch {
                /* ignore */
            }
            await purgeCookiesAuth();

            const destino = destinoPosLogin(callbackUrl);
            await signIn("google", { callbackUrl: destino });
        } catch {
            setCarregando(false);
            endAuthTransition();
        }
    }

    const baseLanding =
        "group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-full border-2 border-azul-900/15 bg-white px-6 py-3 font-gabarito-bold text-xl text-azul-900 shadow-[0_10px_30px_-18px_rgba(27,36,50,0.55)] transition hover:border-azul-600/40 hover:bg-azul-50 hover:shadow-[0_14px_34px_-16px_rgba(0,72,255,0.35)] disabled:cursor-wait disabled:opacity-70";
    const baseModal =
        "flex w-full items-center justify-center gap-2 rounded-full border-2 border-cinza-300 bg-white px-4 py-2.5 font-gabarito-bold text-base text-azul-900 transition hover:border-azul-600 hover:bg-azul-50 disabled:cursor-wait disabled:opacity-70";

    return (
        <button
            type="button"
            onClick={() => void handleGoogle()}
            disabled={carregando}
            className={`${variante === "landing" ? baseLanding : baseModal} cursor-pointer ${className}`}
        >
            <Image src="/assets/images/google.svg" width={22} height={22} alt="" className="shrink-0" />
            <span>{carregando ? "Conectando..." : "Entrar com o Google"}</span>
        </button>
    );
}
