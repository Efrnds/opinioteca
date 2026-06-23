"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

export default function SessaoExpiradaProvider({ children }: { children: React.ReactNode }) {
    const [aberto, setAberto] = useState(false);
    const tratandoRef = useRef(false);

    const encerrarSessao = useCallback(() => {
        setAberto(false);
        signOut({ callbackUrl: "/" });
    }, []);

    useEffect(() => {
        const fetchOriginal = window.fetch.bind(window);

        window.fetch = async (...args: Parameters<typeof fetch>) => {
            const resposta = await fetchOriginal(...args);

            const entrada = args[0];
            const url =
                typeof entrada === "string"
                    ? entrada
                    : entrada instanceof Request
                      ? entrada.url
                      : entrada instanceof URL
                        ? entrada.href
                        : "";

            if (
                resposta.status === 401 &&
                url.includes("/api/") &&
                !url.includes("/api/auth") &&
                !tratandoRef.current
            ) {
                tratandoRef.current = true;
                setAberto(true);
            }

            return resposta;
        };

        return () => {
            window.fetch = fetchOriginal;
        };
    }, []);

    useEffect(() => {
        if (!aberto) return;
        const timer = setTimeout(encerrarSessao, 3000);
        return () => clearTimeout(timer);
    }, [aberto, encerrarSessao]);

    return (
        <>
            {children}
            <Dialog
                open={aberto}
                onOpenChange={(open) => {
                    if (!open) encerrarSessao();
                }}
            >
                <DialogContent showCloseButton>
                    <DialogHeader>
                        <DialogTitle className="font-gabarito-bold text-xl text-azul-900">
                            Sessão expirada
                        </DialogTitle>
                        <DialogDescription className="font-gabarito-regular text-cinza-700">
                            Sua sessão expirou. Por favor, faça login novamente.
                        </DialogDescription>
                    </DialogHeader>
                </DialogContent>
            </Dialog>
        </>
    );
}
