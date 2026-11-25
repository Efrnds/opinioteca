import { clearPerfilCache } from "@/lib/perfil-cache";
import { wsClient } from "@/lib/ws/client";
const LOCAL_STORAGE_EXATO = ["opinioteca-tema", "opinioteca-session-id", "opinioteca-session-nick"];
const LOCAL_STORAGE_PREFIXOS = ["opinioteca-", "aviso-assinatura-expira:"];
export function limparStorageCliente() {
    clearPerfilCache();
    try {
        wsClient.disconnect();
    }
    catch {
    }
    try {
        sessionStorage.clear();
    }
    catch {
    }
    try {
        const remover: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key)
                continue;
            if (LOCAL_STORAGE_EXATO.includes(key) ||
                LOCAL_STORAGE_PREFIXOS.some((p) => key.startsWith(p))) {
                remover.push(key);
            }
        }
        for (const key of remover) {
            localStorage.removeItem(key);
        }
    }
    catch {
    }
}
export async function purgeCookiesAuth(): Promise<void> {
    try {
        await fetch("/api/auth/purge-cookies", {
            method: "POST",
            credentials: "same-origin",
            cache: "no-store",
        });
    }
    catch {
    }
}
export async function encerrarSessaoCompleta(destino = "/") {
    limparStorageCliente();
    const { signOut } = await import("next-auth/react");
    try {
        await signOut({ redirect: false });
    }
    catch {
    }
    await purgeCookiesAuth();
    sinalizarTrocaAuth();
    window.location.href = destino;
}
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
export function sinalizarTrocaAuth(userId?: string) {
    try {
        localStorage.setItem(AUTH_EPOCH_KEY, `${Date.now()}:${userId ?? "out"}`);
    }
    catch {
    }
}
