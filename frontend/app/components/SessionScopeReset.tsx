"use client";

import { clearPerfilCache } from "@/lib/perfil-cache";
import { limparStorageCliente } from "@/lib/session-cleanup";
import { wsClient } from "@/lib/ws/client";
import { useSession } from "next-auth/react";
import { useEffect, useRef, type ReactNode } from "react";

function sessionScopeKey(status: string, userId?: string, accessToken?: string) {
    if (status !== "authenticated" || !userId || !accessToken) {
        return `guest:${status}`;
    }
    return `user:${userId}:${accessToken}`;
}

/**
 * Reinicia o subtree quando a identidade da sessão muda (login, logout, troca de conta, outra aba).
 * Evita que estado React de um usuário vaze para outro.
 */
export default function SessionScopeReset({ children }: { children: ReactNode }) {
    const { data: session, status } = useSession();
    const userId = session?.user?.id;
    const scopeKey = sessionScopeKey(status, userId, session?.accessToken);
    const prevKeyRef = useRef(scopeKey);
    const prevUserIdRef = useRef<string | undefined>(userId);

    useEffect(() => {
        if (prevKeyRef.current === scopeKey) {
            return;
        }

        clearPerfilCache();
        try {
            wsClient.disconnect();
        } catch {
            /* ignore */
        }

        const prevUserId = prevUserIdRef.current;
        // Troca real de conta (não só loading→authenticated do mesmo user): limpa storage residual.
        if (prevUserId && userId && prevUserId !== userId) {
            limparStorageCliente();
        }

        prevKeyRef.current = scopeKey;
        prevUserIdRef.current = userId;
    }, [scopeKey, userId]);

    return (
        <div key={scopeKey} className="contents">
            {children}
        </div>
    );
}
