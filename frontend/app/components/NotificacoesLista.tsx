"use client";

import {
    nomeDoTituloNotificacao,
    notificacaoEstaLida,
    notificacaoEhSistema,
    referenciaEhUsuario,
    resolverDestinoNotificacao,
    textoAcaoNotificacao,
    tituloExibicaoNotificacao,
} from "@/lib/notificacoes";
import { notificacaoEhMensagem } from "@/lib/ws/types";
import { mediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";
import type { Notificacao } from "@/types/notificacao";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useWebSocket } from "./WebSocketProvider";

type Ator = { nick: string; image?: string };

function useAtores(notificacoes: Notificacao[]) {
    const [atores, setAtores] = useState<Record<number, Ator>>({});
    const carregadosRef = useRef<Set<number>>(new Set());

    useEffect(() => {
        notificacoes.forEach(async n => {
            if (!n.referencia_id || !referenciaEhUsuario(n.tipo_notificacao)) return;
            if (carregadosRef.current.has(n.referencia_id)) return;
            carregadosRef.current.add(n.referencia_id);

            const id = n.referencia_id;
            try {
                const res = await fetch(`/api/usuarios/id/${id}`);
                if (res.ok) {
                    const u = (await res.json()) as { nick?: string; image?: string };
                    setAtores(prev => ({
                        ...prev,
                        [id]: { nick: u.nick ?? nomeDoTituloNotificacao(n.titulo), image: u.image },
                    }));
                }
            } catch {
                setAtores(prev => ({
                    ...prev,
                    [id]: { nick: nomeDoTituloNotificacao(n.titulo) },
                }));
            }
        });
    }, [notificacoes]);

    function nomeExibicao(notif: Notificacao) {
        if (notif.referencia_id && atores[notif.referencia_id]) {
            return atores[notif.referencia_id].nick;
        }
        return nomeDoTituloNotificacao(notif.titulo);
    }

    function avatarExibicao(notif: Notificacao) {
        if (notif.referencia_id) return atores[notif.referencia_id]?.image;
        return undefined;
    }

    return { nomeExibicao, avatarExibicao };
}

export default function NotificacoesLista() {
    const router = useRouter();
    const {
        notificacoes,
        notificacoesCarregando,
        notificacoesCarregandoMais,
        temMaisNotificacoes,
        marcarNotificacaoLida,
        carregarNotificacoes,
        carregarMaisNotificacoes,
    } = useWebSocket();
    const notificacoesVisiveis = notificacoes.filter((n) => !notificacaoEhMensagem(n));
    const { nomeExibicao, avatarExibicao } = useAtores(notificacoesVisiveis);

    useEffect(() => {
        void carregarNotificacoes();
    }, [carregarNotificacoes]);

    function abrirNotificacao(notif: Notificacao) {
        if (!notificacaoEstaLida(notif.lida)) {
            marcarNotificacaoLida(notif.id);
        }
        resolverDestinoNotificacao(notif).then(destino => router.push(destino));
    }

    if (notificacoesCarregando && notificacoesVisiveis.length === 0) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-azul-600" />
            </div>
        );
    }

    if (notificacoesVisiveis.length === 0) {
        return (
            <p className="py-12 text-center font-gabarito-regular text-sm text-cinza-700">Nenhuma notificação ainda.</p>
        );
    }

    return (
        <div className="flex flex-col gap-3">
            <ul className="flex flex-col gap-3">
                {notificacoesVisiveis.map((notif) => {
                    const nick = tituloExibicaoNotificacao(notif);
                    const avatar = notificacaoEhSistema(notif.tipo_notificacao) ? undefined : avatarExibicao(notif);
                    const acao = textoAcaoNotificacao(notif.tipo_notificacao);

                    return (
                        <li key={notif.id}>
                            <button
                                type="button"
                                onClick={() => abrirNotificacao(notif)}
                                className={cn(
                                    "flex w-full items-center justify-between gap-4 rounded-xl border-2 px-4 py-3 text-left transition hover:opacity-90",
                                    !notificacaoEstaLida(notif.lida) ? "border-azul-600 bg-[#EAF1FF]" : "border-gray-300 bg-white",
                                )}
                            >
                                <div className="flex min-w-0 items-center gap-3">
                                    {avatar ? (
                                        <Image
                                            src={mediaUrl(avatar)!}
                                            alt={nick}
                                            width={40}
                                            height={40}
                                            className="h-10 w-10 shrink-0 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div
                                            className={cn(
                                                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-gabarito-bold text-sm",
                                                !notificacaoEstaLida(notif.lida) ? "bg-azul-600 text-white" : "bg-gray-200 text-gray-600",
                                            )}
                                        >
                                            {nick.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <span
                                        className={cn(
                                            "truncate text-base",
                                            !notificacaoEstaLida(notif.lida)
                                                ? "font-gabarito-bold text-azul-600"
                                                : "font-gabarito-regular text-gray-500",
                                        )}
                                    >
                                        {nick}
                                    </span>
                                </div>
                                <span
                                    className={cn(
                                        "shrink-0 text-base",
                                        !notif.lida
                                            ? "font-gabarito-bold text-azul-600"
                                            : "font-gabarito-regular text-gray-500",
                                    )}
                                >
                                    {acao}
                                </span>
                            </button>
                        </li>
                    );
                })}
            </ul>
            {temMaisNotificacoes && (
                <div className="flex justify-center pt-1">
                    <button
                        type="button"
                        onClick={() => void carregarMaisNotificacoes()}
                        disabled={notificacoesCarregandoMais}
                        className="inline-flex items-center gap-2 rounded-xl px-4 py-2 font-gabarito-medium text-sm text-azul-600 transition hover:bg-azul-50 hover:text-azul-800 disabled:opacity-60"
                    >
                        {notificacoesCarregandoMais ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Carregando…
                            </>
                        ) : (
                            "Ver mais"
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}
