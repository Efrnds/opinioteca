import type { WsEnvelope, WsListener } from "./types";

type Status = "idle" | "connecting" | "open" | "closed";

const MAX_BACKOFF_MS = 30_000;
const BASE_BACKOFF_MS = 1_000;

export class WsClient {
    private ws: WebSocket | null = null;
    private url = "";
    private token = "";
    private listeners = new Set<WsListener>();
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private backoffAttempt = 0;
    private disposed = false;
    private status: Status = "idle";

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
        this.openSocket();
    }

    disconnect() {
        this.disposed = true;
        this.teardownSocket();
        this.status = "closed";
        this.url = "";
        this.token = "";
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

        this.clearReconnect();
        this.status = "connecting";

        const ws = new WebSocket(`${this.url}?token=${encodeURIComponent(this.token)}`);
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
            ws.close();
        };
    }

    private teardownSocket() {
        this.clearReconnect();
        if (this.ws) {
            this.ws.onclose = null;
            this.ws.onerror = null;
            this.ws.close();
            this.ws = null;
        }
    }

    private scheduleReconnect() {
        if (this.disposed) return;
        const delay = Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** this.backoffAttempt);
        this.backoffAttempt += 1;
        this.reconnectTimer = setTimeout(() => this.openSocket(), delay);
    }

    private clearReconnect() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }
}

export const wsClient = new WsClient();
