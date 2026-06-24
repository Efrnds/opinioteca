"use client";

import { toWsUrl, wsBaseUrl } from "@/lib/media";
import type { Mensagem } from "@/types/mensagem";
import type { Notificacao } from "@/types/notificacao";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type Listener = (tipo: string, payload: unknown) => void;

type WebSocketContextValue = {
    subscribe: (fn: Listener) => () => void;
    setChatAtivo: (id: number | null) => void;
    contagemNaoLidas: number;
    decrementarContagem: () => void;
    recarregarContagem: () => Promise<void>;
    notificacoes: Notificacao[];
    notificacoesCarregando: boolean;
    carregarNotificacoes: () => Promise<void>;
    marcarNotificacaoLida: (id: number) => void;
};

const WebSocketContext = createContext<WebSocketContextValue>({
    subscribe: () => () => {},
    setChatAtivo: () => {},
    contagemNaoLidas: 0,
    decrementarContagem: () => {},
    recarregarContagem: async () => {},
    notificacoes: [],
    notificacoesCarregando: false,
    carregarNotificacoes: async () => {},
    marcarNotificacaoLida: () => {},
});

export function useWebSocket() {
    return useContext(WebSocketContext);
}

function chatAtivoComRemetente(pathname: string, chatAtivo: number | null, remetenteId: number) {
    if (!pathname.startsWith("/mensagens") || !chatAtivo) return false;
    return chatAtivo === remetenteId;
}

export default function WebSocketProvider({ children }: { children: React.ReactNode }) {
    const { data: session } = useSession();
    const pathname = usePathname();
    const listenersRef = useRef<Set<Listener>>(new Set());
    const chatAtivoRef = useRef<number | null>(null);
    const pathnameRef = useRef(pathname);
    const [contagemNaoLidas, setContagemNaoLidas] = useState(0);
    const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
    const [notificacoesCarregando, setNotificacoesCarregando] = useState(false);

    pathnameRef.current = pathname;

    const recarregarContagem = useCallback(async () => {
        try {
            const res = await fetch("/api/notificacoes");
            if (res.ok) {
                const data = (await res.json()) as Notificacao[];
                setContagemNaoLidas(data.length);
            }
        } catch {
            /* ignore */
        }
    }, []);

    const carregarNotificacoes = useCallback(async () => {
        setNotificacoesCarregando(true);
        try {
            const res = await fetch("/api/notificacoes?todas=true");
            if (res.ok) {
                setNotificacoes((await res.json()) as Notificacao[]);
            }
        } catch {
            /* ignore */
        } finally {
            setNotificacoesCarregando(false);
        }
    }, []);

    const decrementarContagem = useCallback(() => {
        setContagemNaoLidas((c) => Math.max(0, c - 1));
    }, []);

    const marcarNotificacaoLida = useCallback(
        (id: number) => {
            setNotificacoes((atual) => {
                const alvo = atual.find((n) => n.id === id);
                if (alvo && !alvo.lida) {
                    decrementarContagem();
                }
                return atual.map((n) => (n.id === id ? { ...n, lida: true } : n));
            });
            fetch(`/api/notificacoes/${id}/ler`, { method: "PUT" }).catch(() => {});
        },
        [decrementarContagem],
    );

    const subscribe = useCallback((fn: Listener) => {
        listenersRef.current.add(fn);
        return () => listenersRef.current.delete(fn);
    }, []);

    const setChatAtivo = useCallback((id: number | null) => {
        chatAtivoRef.current = id;
    }, []);

    const emitir = useCallback((tipo: string, payload: unknown) => {
        listenersRef.current.forEach((fn) => fn(tipo, payload));
    }, []);

    const marcarNotificacaoLidaSilenciosa = useCallback((id: number) => {
        setNotificacoes((atual) => atual.map((n) => (n.id === id ? { ...n, lida: true } : n)));
        fetch(`/api/notificacoes/${id}/ler`, { method: "PUT" }).catch(() => {});
    }, []);

    const marcarMensagemLidaSilenciosa = useCallback((id: number) => {
        fetch(`/api/mensagens/msg/${id}/ler`, { method: "PUT" }).catch(() => {});
    }, []);

    useEffect(() => {
        if (session?.accessToken) {
            recarregarContagem();
            carregarNotificacoes();
        }
    }, [session?.accessToken, recarregarContagem, carregarNotificacoes]);

    useEffect(() => {
        const token = session?.accessToken;
        if (!token) return;

        const wsUrl = `${toWsUrl(wsBaseUrl())}/ws?token=${encodeURIComponent(token)}`;

        const ws = new WebSocket(wsUrl);

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data) as { tipo: string; payload: unknown };
                const chatAtivo = chatAtivoRef.current;
                const rota = pathnameRef.current;

                emitir(data.tipo, data.payload);

                if (data.tipo === "NOVA_MENSAGEM") {
                    const msg = data.payload as Mensagem;
                    const silenciar = chatAtivoComRemetente(rota, chatAtivo, msg.remetente_id);

                    if (silenciar) {
                        marcarMensagemLidaSilenciosa(msg.id);
                        return;
                    }

                    toast.info("Nova mensagem", {
                        description: msg.conteudo?.trim() || "📷 Imagem",
                    });
                    return;
                }

                if (data.tipo === "NOVA_NOTIFICACAO") {
                    const notif = data.payload as Notificacao;
                    const silenciarMensagem =
                        notif.tipo_notificacao === "mensagem" &&
                        chatAtivoComRemetente(rota, chatAtivo, notif.referencia_id ?? 0);

                    setNotificacoes((atual) => {
                        if (atual.some((n) => n.id === notif.id)) return atual;
                        return [notif, ...atual];
                    });

                    if (silenciarMensagem) {
                        marcarNotificacaoLidaSilenciosa(notif.id);
                        return;
                    }

                    setContagemNaoLidas((c) => c + 1);
                    if (notif.tipo_notificacao !== "mensagem") {
                        toast.info(notif.titulo, { description: notif.conteudo });
                    }
                }
            } catch {
                /* ignore */
            }
        };

        return () => ws.close();
    }, [session?.accessToken, emitir, marcarMensagemLidaSilenciosa, marcarNotificacaoLidaSilenciosa]);

    return (
        <WebSocketContext.Provider
            value={{
                subscribe,
                setChatAtivo,
                contagemNaoLidas,
                decrementarContagem,
                recarregarContagem,
                notificacoes,
                notificacoesCarregando,
                carregarNotificacoes,
                marcarNotificacaoLida,
            }}
        >
            {children}
        </WebSocketContext.Provider>
    );
}
