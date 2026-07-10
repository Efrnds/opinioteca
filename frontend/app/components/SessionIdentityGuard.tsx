"use client";

import { AUTH_EPOCH_KEY } from "@/lib/session-cleanup";
import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";

const STORAGE_ID = "opinioteca-session-id";
const STORAGE_NICK = "opinioteca-session-nick";

/**
 * Se o nick/id exibido na sessão divergir do marcador local (ex.: outra aba trocou a conta),
 * força reload para descartar estado React/RSC stale.
 */
export default function SessionIdentityGuard() {
    const { data: session, status } = useSession();
    const recarregandoRef = useRef(false);

    useEffect(() => {
        function onStorage(e: StorageEvent) {
            if (e.key !== AUTH_EPOCH_KEY || !e.newValue || recarregandoRef.current) {
                return;
            }
            recarregandoRef.current = true;
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
                window.location.reload();
                return;
            }

            sessionStorage.setItem(STORAGE_ID, id);
            sessionStorage.setItem(STORAGE_NICK, nick);
        } catch {
            /* ignore */
        }
    }, [status, session?.user?.id, session?.user?.nick]);

    return null;
}
