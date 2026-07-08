"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import AuthenticatedLayout from "./components/AuthenticatedLayout";
import { AuthGateProvider } from "./components/AuthGateProvider";
import { AuthTransitionProvider } from "./components/AuthTransitionProvider";
import { ConfiguracoesProvider } from "./components/ConfiguracoesProvider";
import { PlanoProvider } from "./components/PlanoProvider";
import SessionScopeReset from "./components/SessionScopeReset";
import SessaoExpiradaProvider from "./components/SessaoExpiradaProvider";
import WebSocketProvider from "./components/WebSocketProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider refetchOnWindowFocus>
            <SessionScopeReset>
            <AuthTransitionProvider>
                <AuthGateProvider>
                    <ConfiguracoesProvider>
                        <PlanoProvider>
                            <AuthenticatedLayout>
                            <WebSocketProvider>
                                <SessaoExpiradaProvider>
                                    {children}
                                    <Toaster position="top-right" richColors closeButton />
                                </SessaoExpiradaProvider>
                            </WebSocketProvider>
                        </AuthenticatedLayout>
                        </PlanoProvider>
                    </ConfiguracoesProvider>
                </AuthGateProvider>
            </AuthTransitionProvider>
            </SessionScopeReset>
        </SessionProvider>
    );
}
