import { clearPerfilCache } from "@/lib/perfil-cache";
import { wsClient } from "@/lib/ws/client";

/** Chaves/prefixos de localStorage ligados à identidade ou preferências do app. */
const LOCAL_STORAGE_EXATO = ["opinioteca-tema", "opinioteca-session-id", "opinioteca-session-nick"];
const LOCAL_STORAGE_PREFIXOS = ["opinioteca-", "aviso-assinatura-expira:"];

/**
 * Limpa estado de cliente que pode vazar entre contas (caches, tema, WS, storage).
 * Cookies httpOnly são limpos via /api/auth/purge-cookies + signOut do Auth.js.
 */
export function limparStorageCliente() {
    clearPerfilCache();
    try {
        wsClient.disconnect();
    } catch {
        /* ignore */
    }

    try {
        sessionStorage.clear();
    } catch {
        /* ignore */
    }

    try {
        const remover: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key) continue;
            if (
                LOCAL_STORAGE_EXATO.includes(key) ||
                LOCAL_STORAGE_PREFIXOS.some((p) => key.startsWith(p))
            ) {
                remover.push(key);
            }
        }
        for (const key of remover) {
            localStorage.removeItem(key);
        }
    } catch {
        /* ignore */
    }
}

/** Expira cookies Auth.js/next-auth (secure e não-secure, inclusive chunks). */
export async function purgeCookiesAuth(): Promise<void> {
    try {
        await fetch("/api/auth/purge-cookies", {
            method: "POST",
            credentials: "same-origin",
            cache: "no-store",
        });
    } catch {
        /* ignore */
    }
}

/**
 * Encerra sessão de forma definitiva: storage → signOut Auth.js → purge de cookies → hard redirect.
 */
export async function encerrarSessaoCompleta(destino = "/") {
    limparStorageCliente();
    const { signOut } = await import("next-auth/react");
    try {
        await signOut({ redirect: false });
    } catch {
        /* ignore */
    }
    await purgeCookiesAuth();
    sinalizarTrocaAuth();
    window.location.href = destino;
}

/** Destino seguro pós-login (evita open redirect). */
export function destinoPosLogin(callbackUrl?: string | null) {
    if (!callbackUrl || !callbackUrl.startsWith("/") || callbackUrl.startsWith("//")) {
        return "/home";
    }
    if (callbackUrl === "/") {
        return "/home";
    }
    return callbackUrl;
}

export const AUTH_EPOCH_KEY = "opinioteca-auth-epoch";

/** Avisa outras abas (storage event) para recarregar após login/logout. */
export function sinalizarTrocaAuth(userId?: string) {
    try {
        localStorage.setItem(AUTH_EPOCH_KEY, `${Date.now()}:${userId ?? "out"}`);
    } catch {
        /* ignore */
    }
}
