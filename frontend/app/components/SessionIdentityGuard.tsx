"use client";

import { AUTH_EPOCH_KEY, encerrarSessaoCompleta } from "@/lib/session-cleanup";
import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";

const STORAGE_ID = "opinioteca-session-id";
const STORAGE_NICK = "opinioteca-session-nick";
const VALIDATED_KEY = "opinioteca-identity-validated";

/**
 * Se o nick/id exibido na sessão divergir do marcador local (ex.: outra aba trocou a conta),
 * força reload para descartar estado React/RSC stale.
 *
 * Também valida o JWT da sessão contra o backend na primeira carga autenticada —
 * se cookie/sessão veio de cache de proxy ou identidade inconsistente, encerra a sessão.
 */
export default function SessionIdentityGuard() {
    const { data: session, status } = useSession();
    const recarregandoRef = useRef(false);
    const validandoRef = useRef(false);

    useEffect(() => {
        function onStorage(e: StorageEvent) {
            if (e.key !== AUTH_EPOCH_KEY || !e.newValue || recarregandoRef.current) {
                return;
            }
            recarregandoRef.current = true;
            try {
                sessionStorage.removeItem(VALIDATED_KEY);
            } catch {
                /* ignore */
            }
            window.location.reload();
        }
        window.addEventListener("storage", onStorage);
        return () => window.removeEventListener("storage", onStorage);
    }, []);

    useEffect(() => {
        if (status === "loading" || recarregandoRef.current) {
            return;
        }

        if (status !== "authenticated") {
            try {
                sessionStorage.removeItem(STORAGE_ID);
                sessionStorage.removeItem(STORAGE_NICK);
                sessionStorage.removeItem(VALIDATED_KEY);
            } catch {
                /* ignore */
            }
            return;
        }

        const id = session?.user?.id;
        const nick = session?.user?.nick;
        if (!id || !nick) {
            return;
        }

        try {
            const cachedId = sessionStorage.getItem(STORAGE_ID);
            const cachedNick = sessionStorage.getItem(STORAGE_NICK);

            if ((cachedId && cachedId !== id) || (cachedNick && cachedNick !== nick)) {
                recarregandoRef.current = true;
                sessionStorage.setItem(STORAGE_ID, id);
                sessionStorage.setItem(STORAGE_NICK, nick);
                sessionStorage.removeItem(VALIDATED_KEY);
                window.location.reload();
                return;
            }

            sessionStorage.setItem(STORAGE_ID, id);
            sessionStorage.setItem(STORAGE_NICK, nick);
        } catch {
            /* ignore */
        }
    }, [status, session?.user?.id, session?.user?.nick]);

    useEffect(() => {
        if (status !== "authenticated" || !session?.user?.id || !session?.accessToken) {
            return;
        }
        if (validandoRef.current || recarregandoRef.current) {
            return;
        }

        const marker = `${session.user.id}:${session.accessToken.slice(-12)}`;
        try {
            if (sessionStorage.getItem(VALIDATED_KEY) === marker) {
                return;
            }
        } catch {
            /* ignore */
        }

        validandoRef.current = true;
        let cancelled = false;

        void (async () => {
            try {
                const res = await fetch("/api/auth/validate-identity", {
                    credentials: "same-origin",
                    cache: "no-store",
                });
                if (cancelled) return;

                const data = (await res.json().catch(() => null)) as {
                    ok?: boolean;
                    reason?: string;
                } | null;

                if (res.status === 409 || data?.ok === false) {
                    recarregandoRef.current = true;
                    try {
                        sessionStorage.removeItem(VALIDATED_KEY);
                    } catch {
                        /* ignore */
                    }
                    await encerrarSessaoCompleta("/");
                    return;
                }

                try {
                    sessionStorage.setItem(VALIDATED_KEY, marker);
                } catch {
                    /* ignore */
                }
            } catch {
                /* rede — não derruba sessão */
            } finally {
                validandoRef.current = false;
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [status, session?.user?.id, session?.accessToken]);

    return null;
}
