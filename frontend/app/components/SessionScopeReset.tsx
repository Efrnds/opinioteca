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
export default function SessionScopeReset({ children }: {
    children: ReactNode;
}) {
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
        }
        catch {
        }
        const prevUserId = prevUserIdRef.current;
        if (prevUserId && userId && prevUserId !== userId) {
            limparStorageCliente();
        }
        prevKeyRef.current = scopeKey;
        prevUserIdRef.current = userId;
    }, [scopeKey, userId]);
    return (<div key={scopeKey} className="contents">
            {children}
        </div>);
}
