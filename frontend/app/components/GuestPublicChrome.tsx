"use client";

import Image from "next/image";
import Link from "next/link";
import { useAuthGate } from "./AuthGateProvider";

export default function GuestPublicChrome({ children }: { children: React.ReactNode }) {
    const { abrirAuth } = useAuthGate();

    return (
        <div className="min-h-screen bg-gradient-to-b from-azul-100 via-white to-azul-50">
            <header className="sticky top-0 z-40 border-b border-azul-200/60 bg-white/80 backdrop-blur">
                <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
                    <Link href="/" className="flex items-center gap-2">
                        <Image
                            src="/assets/images/Vector.svg"
                            width={36}
                            height={30}
                            alt="Opinioteca"
                        />
                        <span className="font-gabarito-bold text-lg text-azul-900">Opinioteca</span>
                    </Link>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => abrirAuth("login")}
                            className="rounded-full px-4 py-1.5 font-gabarito-medium text-sm text-azul-800 hover:bg-azul-100"
                        >
                            Entrar
                        </button>
                        <button
                            type="button"
                            onClick={() => abrirAuth("cadastro")}
                            className="rounded-full bg-azul-600 px-4 py-1.5 font-gabarito-bold text-sm text-white hover:bg-azul-700"
                        >
                            Criar conta
                        </button>
                    </div>
                </div>
            </header>
            <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
        </div>
    );
}
