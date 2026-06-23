"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import SessaoExpiradaProvider from "./components/SessaoExpiradaProvider";
import WebSocketProvider from "./components/WebSocketProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <WebSocketProvider>
                <SessaoExpiradaProvider>
                    {children}
                    <Toaster position="top-right" richColors closeButton />
                </SessaoExpiradaProvider>
            </WebSocketProvider>
        </SessionProvider>
    );
}
