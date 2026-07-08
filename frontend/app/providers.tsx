"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import AuthenticatedLayout from "./components/AuthenticatedLayout";
import { AuthGateProvider } from "./components/AuthGateProvider";
import { AuthTransitionProvider } from "./components/AuthTransitionProvider";
import { ConfiguracoesProvider } from "./components/ConfiguracoesProvider";
import SessaoExpiradaProvider from "./components/SessaoExpiradaProvider";
import WebSocketProvider from "./components/WebSocketProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <AuthTransitionProvider>
                <AuthGateProvider>
                    <ConfiguracoesProvider>
                        <AuthenticatedLayout>
                            <WebSocketProvider>
                                <SessaoExpiradaProvider>
                                    {children}
                                    <Toaster position="top-right" richColors closeButton />
                                </SessaoExpiradaProvider>
                            </WebSocketProvider>
                        </AuthenticatedLayout>
                    </ConfiguracoesProvider>
                </AuthGateProvider>
            </AuthTransitionProvider>
        </SessionProvider>
    );
}
