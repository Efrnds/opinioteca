"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import AuthModal from "./AuthModal";

type AuthMode = "login" | "cadastro";

type LandingProps = {
    initialAuth?: string;
    callbackUrl?: string;
};

export default function Landing({ initialAuth, callbackUrl = "/home" }: LandingProps) {
    const router = useRouter();
    const [modalAberto, setModalAberto] = useState(false);
    const [modo, setModo] = useState<AuthMode>("login");

    const abrirModal = useCallback(
        (mode: AuthMode) => {
            setModo(mode);
            setModalAberto(true);
            const params = new URLSearchParams();
            params.set("auth", mode);
            if (callbackUrl !== "/home") {
                params.set("callbackUrl", callbackUrl);
            }
            router.push(`/?${params.toString()}`);
        },
        [router, callbackUrl],
    );

    const fecharModal = useCallback(() => {
        setModalAberto(false);
        router.replace("/");
    }, [router]);

    const trocarModo = useCallback(
        (mode: AuthMode) => {
            setModo(mode);
            const params = new URLSearchParams();
            params.set("auth", mode);
            if (callbackUrl !== "/home") {
                params.set("callbackUrl", callbackUrl);
            }
            router.replace(`/?${params.toString()}`);
        },
        [router, callbackUrl],
    );

    useEffect(() => {
        if (initialAuth === "login" || initialAuth === "cadastro") {
            setModo(initialAuth);
            setModalAberto(true);
        }
    }, [initialAuth]);

    return (
        <>
            <div className="lg:flex grid grid-cols-1 justify-between h-screen w-screen lg:p-36 p-18">
                <section className="flex flex-col my-auto gap-12">
                    <div className="flex flex-col gap-2">
                        <Image src="/assets/images/Vector.svg" width={200} height={163} alt="Logo da opinioteca" />
                        <h1 className="font-gabarito-bold text-5xl">opinioteca</h1>
                    </div>
                    <p className="font-inria-regular text-2xl">
                        &quot;A alma é essa coisa que nos pergunta se a alma existe&quot; <br />
                        Mario Quintana
                    </p>
                </section>
                <section className="flex flex-col my-auto gap-16">
                    <div className="flex flex-col gap-2.5">
                        <button
                            type="button"
                            disabled
                            className="flex text-center gap-2 px-6 py-2 rounded-full text-white font-bold text-2xl bg-azul-600 border-4 border-azul-600 opacity-50 cursor-not-allowed"
                        >
                            <Image src="/assets/images/google.svg" width={24} height={24} alt="" />
                            Entrar com o google
                        </button>
                        <div className="flex gap-2 align-middle">
                            <hr className="my-auto border flex-1" />
                            <p>ou</p>
                            <hr className="my-auto border flex-1" />
                        </div>
                        <button
                            type="button"
                            onClick={() => abrirModal("cadastro")}
                            className="flex gap-2 justify-center px-6 py-2 rounded-full text-white font-bold text-2xl bg-azul-600 border-4 border-azul-600"
                        >
                            Criar conta
                        </button>
                    </div>
                    <div className="flex flex-col gap-2">
                        <p className="font-bold text-2xl">Já possui uma conta?</p>
                        <button
                            type="button"
                            onClick={() => abrirModal("login")}
                            className="flex gap-2 justify-center px-7 py-2.5 rounded-full text-azul-600 bg-background font-bold text-2xl border-4"
                        >
                            Entrar
                        </button>
                    </div>
                </section>
            </div>

            {modalAberto && (
                <AuthModal
                    mode={modo}
                    callbackUrl={callbackUrl}
                    onClose={fecharModal}
                    onSwitchMode={trocarModo}
                />
            )}
        </>
    );
}
