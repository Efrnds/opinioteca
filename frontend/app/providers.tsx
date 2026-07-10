"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import { useEffect } from "react";
import { aplicarAcessibilidadeSalvaNoDocumento } from "@/lib/acessibilidade";
import AuthenticatedLayout from "./components/AuthenticatedLayout";
import { AuthGateProvider } from "./components/AuthGateProvider";
import { AuthTransitionProvider } from "./components/AuthTransitionProvider";
import { ConfiguracoesProvider } from "./components/ConfiguracoesProvider";
import { PlanoProvider } from "./components/PlanoProvider";
import SessionIdentityGuard from "./components/SessionIdentityGuard";
import SessionScopeReset from "./components/SessionScopeReset";
import SessaoExpiradaProvider from "./components/SessaoExpiradaProvider";
import WebSocketProvider from "./components/WebSocketProvider";

function AcessibilidadeBootstrap() {
    useEffect(() => {
        aplicarAcessibilidadeSalvaNoDocumento();
    }, []);
    return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider refetchOnWindowFocus refetchInterval={5 * 60}>
            <SessionScopeReset>
                <AcessibilidadeBootstrap />
                <SessionIdentityGuard />
                <AuthTransitionProvider>
                    <AuthGateProvider>
                        <ConfiguracoesProvider>
                            <PlanoProvider>
                                <WebSocketProvider>
                                    <AuthenticatedLayout>
                                        <SessaoExpiradaProvider>
                                            {children}
                                            <Toaster position="top-right" richColors closeButton />
                                        </SessaoExpiradaProvider>
                                    </AuthenticatedLayout>
                                </WebSocketProvider>
                            </PlanoProvider>
                        </ConfiguracoesProvider>
                    </AuthGateProvider>
                </AuthTransitionProvider>
            </SessionScopeReset>
        </SessionProvider>
    );
}
