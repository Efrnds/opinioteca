"use client";

import Image from "next/image";
import Link from "next/link";
import { useAuthGate } from "./AuthGateProvider";

export default function GuestPublicChrome({ children }: { children: React.ReactNode }) {
    const { abrirAuth } = useAuthGate();

    return (
        <div className="min-h-dvh min-w-0 overflow-x-clip bg-gradient-to-b from-azul-100 via-white to-azul-50">
            <header className="sticky top-0 z-40 border-b border-azul-200/60 bg-white/80 backdrop-blur">
                <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-3 py-2.5 sm:gap-4 sm:px-4 sm:py-3">
                    <Link href="/" className="flex min-w-0 items-center gap-2">
                        <Image
                            src="/assets/images/Vector.svg"
                            width={36}
                            height={30}
                            alt="Opinioteca"
                            className="logo-opinioteca h-7 w-auto sm:h-8"
                        />
                        <span className="truncate font-gabarito-bold text-base text-azul-900 sm:text-lg">Opinioteca</span>
                    </Link>
                    <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                        <button
                            type="button"
                            onClick={() => abrirAuth("login")}
                            className="rounded-full px-3 py-1.5 font-gabarito-medium text-sm text-azul-800 hover:bg-azul-100 sm:px-4"
                        >
                            Entrar
                        </button>
                        <button
                            type="button"
                            onClick={() => abrirAuth("cadastro")}
                            className="rounded-full bg-azul-600 px-3 py-1.5 font-gabarito-bold text-sm text-white hover:bg-azul-700 sm:px-4"
                        >
                            Criar conta
                        </button>
                    </div>
                </div>
            </header>
            <main className="mx-auto w-full max-w-5xl px-3 py-4 sm:px-4 sm:py-6">{children}</main>
        </div>
    );
}
