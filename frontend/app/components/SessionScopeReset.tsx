"use client";

import { clearPerfilCache } from "@/lib/perfil-cache";
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
    const scopeKey = sessionScopeKey(status, session?.user?.id, session?.accessToken);
    const prevKeyRef = useRef(scopeKey);

    useEffect(() => {
        if (prevKeyRef.current !== scopeKey) {
            clearPerfilCache();
            prevKeyRef.current = scopeKey;
        }
    }, [scopeKey]);

    return (
        <div key={scopeKey} className="contents">
            {children}
        </div>
    );
}
