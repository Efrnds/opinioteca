"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import AuthModal from "./AuthModal";

type AuthMode = "login" | "cadastro";

type Citacao = {
    texto: string;
    autor: string;
};

type LandingProps = {
    initialAuth?: string;
    callbackUrl?: string;
};

export default function Landing({ initialAuth, callbackUrl = "/home" }: LandingProps) {
    const router = useRouter();
    const authInicial = initialAuth === "login" || initialAuth === "cadastro" ? initialAuth : null;
    const [modalAberto, setModalAberto] = useState(() => authInicial !== null);
    const [modo, setModo] = useState<AuthMode>(() => authInicial ?? "login");
    const [citacao, setCitacao] = useState<Citacao>({ texto: "", autor: "" });

    useEffect(() => {
        fetch("/api/citacoes/aleatoria")
            .then((res) => (res.ok ? res.json() : null))
            .then((data: Citacao | null) => {
                if (data?.texto) {
                    setCitacao({ texto: data.texto, autor: data.autor });
                }
            })
            .catch(() => {});
    }, []);

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

    return (
        <>
            <div className="lg:flex grid grid-cols-1 justify-between h-screen w-screen lg:p-36 p-18 ">
                <section className="flex flex-col my-auto gap-8">
                    <div className="flex flex-col gap-2 items-center md:items-start">
                        <Image src="/assets/images/Vector.svg" width={200} height={163} alt="Logo da opinioteca" />
                        <h1 className="font-gabarito-bold text-5xl">opinioteca</h1>
                    </div>
                    <p className="mx-auto hidden max-w-lg text-lg wrap-break-word text-wrap font-inria-regular md:block">
                        &quot;{citacao.texto}&quot; <br />
                        {citacao.autor}
                    </p>
                </section>
                <section className="flex flex-col my-auto gap-16 items-center md:items-start">
                    <div className="flex flex-col gap-2.5 items-center md:items-start w-fit md:w-full ">
                        <button
                            type="button"
                            disabled
                            className="flex gap-2 justify-center px-6 py-2 rounded-full text-white font-bold text-2xl bg-azul-600 w-full cursor-not-allowed opacity-50"
                        >
                            <Image src="/assets/images/google.svg" width={24} height={24} alt="" />
                            Entrar com o google
                        </button>
                        <div className="w-full gap-2 align-middle hidden md:flex">
                            <hr className="my-auto border border-black flex-1" />
                            <p>ou</p>
                            <hr className="my-auto border border-black flex-1" />
                        </div>
                        <button
                            type="button"
                            onClick={() => abrirModal("cadastro")}
                            className="flex gap-2 justify-center px-6 py-2 rounded-full text-white font-bold text-2xl bg-azul-600 w-full cursor-pointer transition hover:bg-azul-600/75"
                        >
                            Criar conta
                        </button>
                    <div className="flex flex-col gap-2 w-full my-10 ">
                        <p className="font-bold 2xl:text-2xl text-xl">Já possui uma conta?</p>
                        <button
                            type="button"
                            onClick={() => abrirModal("login")}
                            className="flex gap-2 justify-center px-7 2xl:py-2.5 py-1 rounded-full text-azul-600 bg-background font-bold text-2xl border-4 border-azul-600 hover:bg-azul-600 transition hover:text-white cursor-pointer"
                        >
                            Entrar
                        </button>
                    </div>
                    </div>
                </section>
            </div>

            <AuthModal
                open={modalAberto}
                mode={modo}
                callbackUrl={callbackUrl}
                onClose={fecharModal}
                onSwitchMode={trocarModo}
            />
        </>
    );
}
