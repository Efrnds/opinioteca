"use client";

import { toWsUrl, wsBaseUrl } from "@/lib/media";
import { contarNotificacoesNaoLidas, notificacaoEstaLida } from "@/lib/notificacoes";
import { wsClient } from "@/lib/ws/client";
import {
    isNotificacao,
    notificacaoEhMensagem,
    parseNovaMensagem,
    type WsListener,
} from "@/lib/ws/types";
import type { Notificacao } from "@/types/notificacao";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type WebSocketContextValue = {
    subscribe: (fn: WsListener) => () => void;
    setChatAtivo: (id: number | null) => void;
    contagemNaoLidas: number;
    mensagensNaoLidasTotal: number;
    decrementarContagem: () => void;
    recarregarContagem: () => Promise<void>;
    recarregarMensagensNaoLidas: () => Promise<void>;
    notificacoes: Notificacao[];
    notificacoesCarregando: boolean;
    carregarNotificacoes: () => Promise<void>;
    marcarNotificacaoLida: (id: number) => void;
};

const WebSocketContext = createContext<WebSocketContextValue>({
    subscribe: () => () => {},
    setChatAtivo: () => {},
    contagemNaoLidas: 0,
    mensagensNaoLidasTotal: 0,
    decrementarContagem: () => {},
    recarregarContagem: async () => {},
    recarregarMensagensNaoLidas: async () => {},
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
    const chatAtivoRef = useRef<number | null>(null);
    const pathnameRef = useRef(pathname);
    const [contagemNaoLidas, setContagemNaoLidas] = useState(0);
    const [mensagensNaoLidasTotal, setMensagensNaoLidasTotal] = useState(0);
    const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
    const [notificacoesCarregando, setNotificacoesCarregando] = useState(false);

    pathnameRef.current = pathname;

    const recarregarContagem = useCallback(async () => {
        try {
            const res = await fetch("/api/notificacoes");
            if (res.ok) {
                const data = (await res.json()) as Notificacao[];
                setContagemNaoLidas(contarNotificacoesNaoLidas(data));
            }
        } catch {
            /* ignore */
        }
    }, []);

    const recarregarMensagensNaoLidas = useCallback(async () => {
        try {
            const res = await fetch("/api/mensagens/contagem-nao-lidas");
            if (res.ok) {
                const data = (await res.json()) as { total?: number };
                setMensagensNaoLidasTotal(data.total ?? 0);
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
                const lista = (await res.json()) as Notificacao[];
                const visiveis = lista.filter((n) => !notificacaoEhMensagem(n));
                setNotificacoes(visiveis);
                setContagemNaoLidas(contarNotificacoesNaoLidas(visiveis));
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
                if (alvo && !notificacaoEstaLida(alvo.lida)) {
                    decrementarContagem();
                }
                return atual.map((n) => (n.id === id ? { ...n, lida: true } : n));
            });
            fetch(`/api/notificacoes/${id}/ler`, { method: "PUT" }).catch(() => {});
        },
        [decrementarContagem],
    );

    const subscribe = useCallback((fn: WsListener) => wsClient.subscribe(fn), []);

    const setChatAtivo = useCallback((id: number | null) => {
        chatAtivoRef.current = id;
    }, []);

    const marcarMensagemLidaSilenciosa = useCallback((id: number) => {
        fetch(`/api/mensagens/msg/${id}/ler`, { method: "PUT" }).catch(() => {});
    }, []);

    useEffect(() => {
        if (session?.accessToken) {
            recarregarContagem();
            recarregarMensagensNaoLidas();
            carregarNotificacoes();
        }
    }, [session?.accessToken, recarregarContagem, recarregarMensagensNaoLidas, carregarNotificacoes]);

    useEffect(() => {
        const token = session?.accessToken;
        if (!token) {
            wsClient.disconnect();
            return;
        }

        const wsUrl = `${toWsUrl(wsBaseUrl())}/ws`;
        wsClient.connect(wsUrl, token);

        return () => wsClient.disconnect();
    }, [session?.accessToken]);

    useEffect(() => {
        if (!session?.accessToken) return;

        return wsClient.subscribe((tipo, payload) => {
            const chatAtivo = chatAtivoRef.current;
            const rota = pathnameRef.current;

            if (tipo === "NOVA_MENSAGEM") {
                const parsed = parseNovaMensagem(payload);
                if (!parsed) return;

                const { mensagem, nao_lidas_total } = parsed;
                const silenciar = chatAtivoComRemetente(rota, chatAtivo, mensagem.remetente_id);

                if (silenciar) {
                    marcarMensagemLidaSilenciosa(mensagem.id);
                } else {
                    setMensagensNaoLidasTotal(nao_lidas_total);
                }
                return;
            }

            if (tipo === "CONVERSA_LIDA" && typeof payload === "object" && payload !== null) {
                const p = payload as { nao_lidas_total?: number };
                if (typeof p.nao_lidas_total === "number") {
                    setMensagensNaoLidasTotal(p.nao_lidas_total);
                }
                return;
            }

            if (tipo === "NOVA_NOTIFICACAO" && isNotificacao(payload)) {
                if (notificacaoEhMensagem(payload)) return;

                setNotificacoes((atual) => {
                    if (atual.some((n) => n.id === payload.id)) return atual;
                    return [payload, ...atual];
                });
                setContagemNaoLidas((c) => c + 1);
                toast.info(payload.titulo, { description: payload.conteudo });
            }
        });
    }, [session?.accessToken, marcarMensagemLidaSilenciosa]);

    return (
        <WebSocketContext.Provider
            value={{
                subscribe,
                setChatAtivo,
                contagemNaoLidas,
                mensagensNaoLidasTotal,
                decrementarContagem,
                recarregarContagem,
                recarregarMensagensNaoLidas,
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
