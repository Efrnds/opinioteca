"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import AuthModal from "./AuthModal";
import BotaoGoogleAuth from "./BotaoGoogleAuth";

type AuthMode = "login" | "cadastro";

type Citacao = {
    texto: string;
    autor: string;
};

type LandingProps = {
    initialAuth?: string;
    callbackUrl?: string;
    authError?: string;
};

function mensagemErroAuth(codigo?: string) {
    if (!codigo) return "";
    const mapa: Record<string, string> = {
        OAuthCallback: "Não foi possível concluir o login com Google. Tente de novo.",
        OAuthAccountNotLinked: "Este email já está ligado a outra forma de entrada.",
        AccessDenied: "Acesso negado pelo Google.",
        Configuration: "Login com Google ainda não está configurado neste ambiente.",
        Callback: "Falha ao autenticar com Google. Tente novamente.",
        Default: "Não foi possível entrar. Tente de novo.",
    };
    return mapa[codigo] ?? mapa.Default;
}

export default function Landing({ initialAuth, callbackUrl = "/home", authError }: LandingProps) {
    const router = useRouter();
    const authInicial = initialAuth === "login" || initialAuth === "cadastro" ? initialAuth : null;
    const [modalAberto, setModalAberto] = useState(() => authInicial !== null);
    const [modo, setModo] = useState<AuthMode>(() => authInicial ?? "login");
    const [citacao, setCitacao] = useState<Citacao>({ texto: "", autor: "" });
    const [erroOAuth, setErroOAuth] = useState(() => mensagemErroAuth(authError));

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

    useEffect(() => {
        setErroOAuth(mensagemErroAuth(authError));
    }, [authError]);

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
            <div className="landing-shell relative min-h-dvh w-full overflow-hidden">
                <div className="landing-glow pointer-events-none absolute inset-0" aria-hidden />
                <div className="landing-grid pointer-events-none absolute inset-0 opacity-[0.35]" aria-hidden />

                <div className="relative z-10 mx-auto grid min-h-dvh w-full max-w-6xl grid-cols-1 items-center gap-10 px-6 py-14 md:px-10 lg:grid-cols-2 lg:gap-16 lg:py-20">
                    <motion.section
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.45, ease: "easeOut" }}
                        className="flex flex-col items-center gap-6 text-center md:items-start md:text-left"
                    >
                        <div className="flex flex-col items-center gap-3 md:items-start">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.92 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.08, duration: 0.4 }}
                            >
                                <Image
                                    src="/assets/images/Vector.svg"
                                    width={168}
                                    height={137}
                                    alt="Logo da opinioteca"
                                    className="logo-opinioteca h-auto w-[140px] sm:w-[168px]"
                                    priority
                                />
                            </motion.div>
                            <h1 className="font-gabarito-bold text-5xl tracking-tight text-azul-900 sm:text-6xl">
                                opinioteca
                            </h1>
                            <p className="max-w-md font-gabarito-medium text-base text-azul-800/80 sm:text-lg">
                                A rede social para quem vive de página em página.
                            </p>
                        </div>

                        {citacao.texto ? (
                            <motion.blockquote
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.18, duration: 0.4 }}
                                className="hidden max-w-lg border-l-4 border-azul-600/70 pl-4 text-left md:block"
                            >
                                <p className="font-inria-regular text-lg leading-relaxed text-azul-900/90">
                                    &ldquo;{citacao.texto}&rdquo;
                                </p>
                                <footer className="mt-2 font-gabarito-medium text-sm text-cinza-700">
                                    — {citacao.autor}
                                </footer>
                            </motion.blockquote>
                        ) : null}
                    </motion.section>

                    <motion.section
                        initial={{ opacity: 0, y: 22 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.12, duration: 0.45, ease: "easeOut" }}
                        className="mx-auto flex w-full max-w-md flex-col gap-5"
                    >
                        <div className="rounded-[2rem] border border-white/70 bg-white/70 p-6 shadow-[0_30px_80px_-40px_rgba(27,36,50,0.55)] backdrop-blur-md sm:p-8">
                            <div className="mb-6 space-y-1 text-center sm:text-left">
                                <p className="font-gabarito-bold text-2xl text-azul-900">Comece por aqui</p>
                                <p className="font-gabarito-regular text-sm text-cinza-700">
                                    Entre com Google ou crie sua conta em poucos segundos.
                                </p>
                            </div>

                            <div className="flex flex-col gap-3">
                                <BotaoGoogleAuth callbackUrl={callbackUrl} variante="landing" />

                                <div className="flex items-center gap-3 py-1">
                                    <hr className="h-px flex-1 border-0 bg-cinza-300" />
                                    <span className="font-gabarito-medium text-sm text-cinza-700">ou</span>
                                    <hr className="h-px flex-1 border-0 bg-cinza-300" />
                                </div>

                                <button
                                    type="button"
                                    onClick={() => abrirModal("cadastro")}
                                    className="flex w-full cursor-pointer items-center justify-center rounded-full bg-azul-600 px-6 py-3 font-gabarito-bold text-xl text-white transition hover:bg-azul-600/90"
                                >
                                    Criar conta
                                </button>

                                {erroOAuth ? (
                                    <p className="rounded-2xl bg-red-50 px-3 py-2 text-center text-sm text-red-700">
                                        {erroOAuth}
                                    </p>
                                ) : null}
                            </div>

                            <div className="mt-8 flex flex-col gap-2 border-t border-cinza-200 pt-6">
                                <p className="font-gabarito-bold text-lg text-azul-900">Já possui uma conta?</p>
                                <button
                                    type="button"
                                    onClick={() => abrirModal("login")}
                                    className="flex w-full cursor-pointer items-center justify-center rounded-full border-4 border-azul-600 bg-transparent px-6 py-2.5 font-gabarito-bold text-xl text-azul-600 transition hover:bg-azul-600 hover:text-white"
                                >
                                    Entrar
                                </button>
                            </div>
                        </div>
                    </motion.section>
                </div>
            </div>

            <AuthModal
                open={modalAberto}
                mode={modo}
                onClose={fecharModal}
                onSwitchMode={trocarModo}
                callbackUrl={callbackUrl}
            />
        </>
    );
}
