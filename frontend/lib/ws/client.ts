import type { WsEnvelope, WsListener } from "./types";

type Status = "idle" | "connecting" | "open" | "closed" | "degraded";

const MAX_BACKOFF_MS = 60_000;
const BASE_BACKOFF_MS = 1_500;
/** Após N falhas consecutivas, para de reconectar em loop (evita spam no console). */
const DEGRADE_AFTER_ATTEMPTS = 6;

export class WsClient {
    private ws: WebSocket | null = null;
    private url = "";
    private token = "";
    private listeners = new Set<WsListener>();
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private backoffAttempt = 0;
    private disposed = false;
    private status: Status = "idle";
    private resumeBound = false;

    connect(url: string, token: string) {
        if (
            this.url === url &&
            this.token === token &&
            (this.status === "open" || this.status === "connecting")
        ) {
            return;
        }

        this.teardownSocket();
        this.url = url;
        this.token = token;
        this.disposed = false;
        this.backoffAttempt = 0;
        this.bindResumeListeners();
        this.openSocket();
    }

    disconnect() {
        this.disposed = true;
        this.unbindResumeListeners();
        this.teardownSocket();
        this.status = "closed";
        this.url = "";
        this.token = "";
        this.backoffAttempt = 0;
    }

    subscribe(listener: WsListener) {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    getStatus() {
        return this.status;
    }

    private openSocket() {
        if (this.disposed || !this.url || !this.token) return;
        if (typeof navigator !== "undefined" && navigator.onLine === false) {
            this.status = "degraded";
            return;
        }

        this.clearReconnect();
        this.status = "connecting";

        let ws: WebSocket;
        try {
            ws = new WebSocket(`${this.url}?token=${encodeURIComponent(this.token)}`);
        } catch {
            this.status = "closed";
            this.scheduleReconnect();
            return;
        }
        this.ws = ws;

        ws.onopen = () => {
            if (this.ws !== ws) return;
            this.status = "open";
            this.backoffAttempt = 0;
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data as string) as WsEnvelope;
                this.listeners.forEach((fn) => fn(data.tipo, data.payload));
            } catch {
                /* ignore malformed */
            }
        };

        ws.onclose = () => {
            if (this.ws !== ws) return;
            this.status = "closed";
            this.ws = null;
            this.scheduleReconnect();
        };

        ws.onerror = () => {
            // O browser já registra a falha; só fecha para disparar onclose/reconnect.
            try {
                ws.close();
            } catch {
                /* ignore */
            }
        };
    }

    private teardownSocket() {
        this.clearReconnect();
        if (this.ws) {
            this.ws.onclose = null;
            this.ws.onerror = null;
            this.ws.onopen = null;
            this.ws.onmessage = null;
            try {
                this.ws.close();
            } catch {
                /* ignore */
            }
            this.ws = null;
        }
    }

    private scheduleReconnect() {
        if (this.disposed) return;

        if (this.backoffAttempt >= DEGRADE_AFTER_ATTEMPTS) {
            this.status = "degraded";
            // Sem timer: retoma em online / aba visível (bindResumeListeners).
            return;
        }

        const delay = Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** this.backoffAttempt);
        this.backoffAttempt += 1;
        this.reconnectTimer = setTimeout(() => this.openSocket(), delay);
    }

    private tryResume = () => {
        if (this.disposed || !this.url || !this.token) return;
        if (this.status === "open" || this.status === "connecting") return;
        if (typeof navigator !== "undefined" && navigator.onLine === false) return;
        if (typeof document !== "undefined" && document.visibilityState === "hidden") return;

        this.backoffAttempt = 0;
        this.openSocket();
    };

    private bindResumeListeners() {
        if (this.resumeBound || typeof window === "undefined") return;
        window.addEventListener("online", this.tryResume);
        document.addEventListener("visibilitychange", this.tryResume);
        this.resumeBound = true;
    }

    private unbindResumeListeners() {
        if (!this.resumeBound || typeof window === "undefined") return;
        window.removeEventListener("online", this.tryResume);
        document.removeEventListener("visibilitychange", this.tryResume);
        this.resumeBound = false;
    }

    private clearReconnect() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }
}

export const wsClient = new WsClient();
