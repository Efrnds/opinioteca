"use client";
import { clearFeedCache } from "@/lib/feed-cache";
import { clearPerfilCache } from "@/lib/perfil-cache";
import { limparStorageCliente } from "@/lib/session-cleanup";
import { useSession } from "next-auth/react";
import { useEffect, useRef, type ReactNode } from "react";
function sessionScopeKey(status: string, userId?: string) {
    if (status !== "authenticated" || !userId) {
        return `guest:${status}`;
    }
    return `user:${userId}`;
}
export default function SessionScopeReset({ children }: {
    children: ReactNode;
}) {
    const { data: session, status } = useSession();
    const userId = session?.user?.id;
    const scopeKey = sessionScopeKey(status, userId);
    const prevKeyRef = useRef(scopeKey);
    const prevUserIdRef = useRef<string | undefined>(userId);
    useEffect(() => {
        if (prevKeyRef.current === scopeKey) {
            return;
        }
        clearPerfilCache();
        clearFeedCache();
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
