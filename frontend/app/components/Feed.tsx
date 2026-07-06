"use client";

import type { AvaliacaoFeed, ComentarioAvaliacao, ContadoresVoto } from "@/types/avaliacao";
import { normalizarPostFeed } from "@/lib/avaliacao";
import { useCallback, useEffect, useRef, useState } from "react";
import { useWebSocket } from "./WebSocketProvider";
import PostCard from "./PostCard";
import SeletorPilula from "./SeletorPilula";

const LIMITE = 10;

type AbaFeed = "forYou" | "seguindo";

type AvaliacaoAtualizadaWS = {
    avaliacao_id: number;
    votos?: ContadoresVoto;
    qtd_comentarios?: number;
    comentario_destaque?: ComentarioAvaliacao | null;
};

type NovoComentarioWS = {
    avaliacao_id: number;
    comentario: ComentarioAvaliacao;
    qtd_comentarios: number;
    comentario_destaque?: ComentarioAvaliacao | null;
};

type ComentarioAtualizadoWS = {
    avaliacao_id: number;
    comentario: ComentarioAvaliacao;
    comentario_destaque?: ComentarioAvaliacao | null;
};

export default function Feed() {
    const { subscribe } = useWebSocket();
    const [aba, setAba] = useState<AbaFeed>("forYou");
    const [posts, setPosts] = useState<AvaliacaoFeed[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [carregandoMais, setCarregandoMais] = useState(false);
    const [temMais, setTemMais] = useState(true);
    const [erro, setErro] = useState("");
    const carregandoRef = useRef(false);
    const abaRef = useRef<AbaFeed>("forYou");

    const carregarFeed = useCallback(async (offset: number, append: boolean, tipoAba: AbaFeed = abaRef.current) => {
        if (carregandoRef.current) return;
        carregandoRef.current = true;

        if (append) setCarregandoMais(true);
        else setCarregando(true);

        const tipo = tipoAba === "seguindo" ? "seguindo" : "foryou";

        try {
            const res = await fetch(`/api/avaliacoes?limite=${LIMITE}&offset=${offset}&tipo=${tipo}`);
            const data = await res.json();

            if (!res.ok) {
                setErro(data.erro || "Não foi possível carregar o feed.");
                return;
            }

            if (!Array.isArray(data)) {
                setErro("Formato inesperado do feed. Verifique se o backend está atualizado.");
                return;
            }

            const normalizados = (data as AvaliacaoFeed[]).map(normalizarPostFeed);
            setPosts((atual) => (append ? [...atual, ...normalizados] : normalizados));
            setTemMais(data.length === LIMITE);
            setErro("");
        } catch {
            setErro("Não foi possível carregar o feed.");
        } finally {
            carregandoRef.current = false;
            setCarregando(false);
            setCarregandoMais(false);
        }
    }, []);

    const trocarAba = useCallback(
        (novaAba: AbaFeed) => {
            if (novaAba === abaRef.current) return;
            abaRef.current = novaAba;
            setAba(novaAba);
            setPosts([]);
            setTemMais(true);
            carregarFeed(0, false, novaAba);
        },
        [carregarFeed],
    );

    useEffect(() => {
        carregarFeed(0, false);

        function onRefresh() {
            setTemMais(true);
            carregarFeed(0, false);
        }

        window.addEventListener("feed:refresh", onRefresh);
        return () => window.removeEventListener("feed:refresh", onRefresh);
    }, [carregarFeed]);

    useEffect(() => {
        return subscribe((tipo, payload) => {
            if (tipo === "AVALIACAO_ATUALIZADA") {
                const dados = payload as AvaliacaoAtualizadaWS;
                setPosts((atual) =>
                    atual.map((post) =>
                        post.id === dados.avaliacao_id
                            ? {
                                  ...post,
                                  votos: dados.votos ?? post.votos,
                                  qtd_comentarios: dados.qtd_comentarios ?? post.qtd_comentarios,
                                  comentario_destaque:
                                      dados.comentario_destaque !== undefined
                                          ? dados.comentario_destaque ?? undefined
                                          : post.comentario_destaque,
                              }
                            : post,
                    ),
                );
                return;
            }

            if (tipo === "NOVO_COMENTARIO") {
                const dados = payload as NovoComentarioWS;
                setPosts((atual) =>
                    atual.map((post) =>
                        post.id === dados.avaliacao_id
                            ? {
                                  ...post,
                                  qtd_comentarios: dados.qtd_comentarios,
                                  comentario_destaque: dados.comentario_destaque ?? post.comentario_destaque,
                              }
                            : post,
                    ),
                );
                return;
            }

            if (tipo === "COMENTARIO_ATUALIZADO") {
                const dados = payload as ComentarioAtualizadoWS;
                setPosts((atual) =>
                    atual.map((post) =>
                        post.id === dados.avaliacao_id
                            ? {
                                  ...post,
                                  comentario_destaque: dados.comentario_destaque ?? post.comentario_destaque,
                              }
                            : post,
                    ),
                );
            }
        });
    }, [subscribe]);

    const removerDoFeed = useCallback((avaliacaoId: number) => {
        setPosts((atual) => atual.filter((post) => post.id !== avaliacaoId));
    }, []);

    useEffect(() => {
        if (!temMais || carregando || carregandoMais || posts.length === 0) return;

        const observador = new IntersectionObserver(
            (entradas) => {
                const [entrada] = entradas;
                if (entrada.isIntersecting) {
                    carregarFeed(posts.length, true);
                }
            },
            { rootMargin: "120px" },
        );

        const alvo = document.getElementById("feed-lazy-sentinel");
        if (alvo) observador.observe(alvo);

        return () => observador.disconnect();
    }, [posts.length, temMais, carregando, carregandoMais, carregarFeed]);

    const abas = (
        <SeletorPilula
            className="mb-1"
            valor={aba}
            onChange={trocarAba}
            opcoes={[
                { valor: "forYou", rotulo: "For You" },
                { valor: "seguindo", rotulo: "Seguindo" },
            ]}
        />
    );

    if (carregando) {
        return (
            <div className="flex flex-col gap-4">
                {abas}
                {[1, 2, 3].map((item) => (
                    <div key={item} className="h-48 animate-pulse rounded-2xl bg-white/70" />
                ))}
            </div>
        );
    }

    if (erro) {
        return (
            <div className="flex flex-col gap-4">
                {abas}
                <div className="rounded-2xl bg-white p-6 text-center">
                    <p className="font-gabarito-bold text-lg text-red-600">{erro}</p>
                </div>
            </div>
        );
    }

    if (posts.length === 0) {
        return (
            <div className="flex flex-col gap-4">
                {abas}
                <div className="rounded-2xl bg-white p-8 text-center">
                    <p className="font-gabarito-bold text-2xl text-azul-900">
                        {aba === "seguindo" ? "Nenhuma resenha de quem você segue" : "Nenhuma resenha ainda"}
                    </p>
                    <p className="mt-2 font-gabarito-regular text-cinza-700">
                        {aba === "seguindo"
                            ? "Siga leitores para ver as resenhas deles aqui."
                            : "Seja o primeiro a publicar uma resenha na opinioteca."}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            {abas}
            {posts.map((post) => (
                <PostCard
                    key={post.id}
                    post={post}
                    onRemovido={removerDoFeed}
                />
            ))}
            <div id="feed-lazy-sentinel" className="h-8" />
            {carregandoMais && <div className="h-24 animate-pulse rounded-2xl bg-white/70" />}
            {!temMais && posts.length > 0 && (
                <p className="py-2 text-center font-gabarito-regular text-sm text-cinza-700">Você chegou ao fim do feed.</p>
            )}
        </div>
    );
}
