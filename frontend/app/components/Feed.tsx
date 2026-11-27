"use client";
import type { AvaliacaoFeed, ComentarioAvaliacao, ContadoresVoto } from "@/types/avaliacao";
import { normalizarPostFeed } from "@/lib/avaliacao";
import {
    clearFeedCache,
    getFeedCache,
    getUltimaAbaFeed,
    resolverPostAncoraVisivel,
    restaurarScrollFeed,
    setFeedCache,
    type AbaFeed,
} from "@/lib/feed-cache";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useWebSocket } from "./WebSocketProvider";
import PostCard from "./PostCard";
import SeletorPilula from "./SeletorPilula";
const LIMITE = 20;
type FeedPaginaResposta = {
    itens: AvaliacaoFeed[];
    next_cursor: string | null;
};
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
    const { data: session } = useSession();
    const accessToken = session?.accessToken;
    const { subscribe } = useWebSocket();
    const [aba, setAba] = useState<AbaFeed>("forYou");
    const [posts, setPosts] = useState<AvaliacaoFeed[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [carregandoMais, setCarregandoMais] = useState(false);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [erro, setErro] = useState("");
    const carregandoRef = useRef(false);
    const abaRef = useRef<AbaFeed>("forYou");
    const nextCursorRef = useRef<string | null>(null);
    const postsRef = useRef<AvaliacaoFeed[]>([]);
    const restaurandoRef = useRef(false);
    const salvarSnapshot = useCallback(() => {
        if (restaurandoRef.current) {
            return;
        }
        if (postsRef.current.length === 0) {
            return;
        }
        setFeedCache({
            aba: abaRef.current,
            posts: postsRef.current,
            nextCursor: nextCursorRef.current,
            anchorPostId: resolverPostAncoraVisivel(),
            scrollY: typeof window !== "undefined" ? window.scrollY : 0,
            savedAt: Date.now(),
        });
    }, []);
    const carregarFeed = useCallback(async (cursor: string | null, append: boolean, tipoAba: AbaFeed = abaRef.current) => {
        if (carregandoRef.current)
            return;
        carregandoRef.current = true;
        if (append)
            setCarregandoMais(true);
        else
            setCarregando(true);
        const tipo = tipoAba === "seguindo" ? "seguindo" : "foryou";
        const params = new URLSearchParams({
            limite: String(LIMITE),
            tipo,
        });
        if (cursor) {
            params.set("cursor", cursor);
        }
        try {
            const res = await fetch(`/api/avaliacoes?${params.toString()}`);
            const data = await res.json();
            if (!res.ok) {
                setErro(data.erro || "Não foi possível carregar o feed.");
                return;
            }
            if (!data || !Array.isArray(data.itens)) {
                setErro("Formato inesperado do feed. Verifique se o backend está atualizado.");
                return;
            }
            const pagina = data as FeedPaginaResposta;
            const normalizados = pagina.itens.map(normalizarPostFeed);
            const cursorProximo = pagina.next_cursor ?? null;
            setPosts((atual) => {
                const proximo = append ? [...atual, ...normalizados] : normalizados;
                postsRef.current = proximo;
                return proximo;
            });
            nextCursorRef.current = cursorProximo;
            setNextCursor(cursorProximo);
            setErro("");
        }
        catch {
            setErro("Não foi possível carregar o feed.");
        }
        finally {
            carregandoRef.current = false;
            setCarregando(false);
            setCarregandoMais(false);
        }
    }, []);
    const trocarAba = useCallback((novaAba: AbaFeed) => {
        if (novaAba === abaRef.current)
            return;
        salvarSnapshot();
        abaRef.current = novaAba;
        setAba(novaAba);
        const cached = getFeedCache(novaAba);
        if (cached && cached.posts.length > 0) {
            postsRef.current = cached.posts;
            setPosts(cached.posts);
            nextCursorRef.current = cached.nextCursor;
            setNextCursor(cached.nextCursor);
            setCarregando(false);
            setErro("");
            restaurandoRef.current = true;
            const ancora = cached.anchorPostId;
            const y = cached.scrollY;
            requestAnimationFrame(() => {
                restaurarScrollFeed(ancora, y);
                window.setTimeout(() => restaurarScrollFeed(ancora, y), 80);
                window.setTimeout(() => {
                    restaurarScrollFeed(ancora, y);
                    restaurandoRef.current = false;
                }, 200);
            });
            return;
        }
        postsRef.current = [];
        setPosts([]);
        nextCursorRef.current = null;
        setNextCursor(null);
        carregarFeed(null, false, novaAba);
    }, [carregarFeed, salvarSnapshot]);
    useEffect(() => {
        postsRef.current = posts;
    }, [posts]);
    useEffect(() => {
        const cached = getFeedCache(getUltimaAbaFeed());
        if (cached && cached.posts.length > 0) {
            abaRef.current = cached.aba;
            setAba(cached.aba);
            postsRef.current = cached.posts;
            setPosts(cached.posts);
            nextCursorRef.current = cached.nextCursor;
            setNextCursor(cached.nextCursor);
            setCarregando(false);
            setErro("");
            restaurandoRef.current = true;
            const ancora = cached.anchorPostId;
            const y = cached.scrollY;
            requestAnimationFrame(() => {
                restaurarScrollFeed(ancora, y);
                window.setTimeout(() => restaurarScrollFeed(ancora, y), 80);
                window.setTimeout(() => {
                    restaurarScrollFeed(ancora, y);
                    restaurandoRef.current = false;
                }, 200);
            });
        }
        else {
            setPosts([]);
            postsRef.current = [];
            nextCursorRef.current = null;
            setNextCursor(null);
            setErro("");
            carregarFeed(null, false);
        }
        function onRefresh() {
            clearFeedCache();
            nextCursorRef.current = null;
            setNextCursor(null);
            postsRef.current = [];
            carregarFeed(null, false);
        }
        function onPageHide() {
            salvarSnapshot();
        }
        window.addEventListener("feed:refresh", onRefresh);
        window.addEventListener("pagehide", onPageHide);
        document.addEventListener("visibilitychange", onPageHide);
        return () => {
            salvarSnapshot();
            window.removeEventListener("feed:refresh", onRefresh);
            window.removeEventListener("pagehide", onPageHide);
            document.removeEventListener("visibilitychange", onPageHide);
        };
    }, [accessToken, carregarFeed, salvarSnapshot]);
    useEffect(() => {
        return subscribe((tipo, payload) => {
            if (tipo === "AVALIACAO_ATUALIZADA") {
                const dados = payload as AvaliacaoAtualizadaWS;
                setPosts((atual) => {
                    const proximo = atual.map((post) => post.id === dados.avaliacao_id
                        ? {
                            ...post,
                            votos: dados.votos ?? post.votos,
                            qtd_comentarios: dados.qtd_comentarios ?? post.qtd_comentarios,
                            comentario_destaque: dados.comentario_destaque !== undefined
                                ? dados.comentario_destaque ?? undefined
                                : post.comentario_destaque,
                        }
                        : post);
                    postsRef.current = proximo;
                    return proximo;
                });
                return;
            }
            if (tipo === "NOVO_COMENTARIO") {
                const dados = payload as NovoComentarioWS;
                setPosts((atual) => {
                    const proximo = atual.map((post) => post.id === dados.avaliacao_id
                        ? {
                            ...post,
                            qtd_comentarios: dados.qtd_comentarios,
                            comentario_destaque: dados.comentario_destaque ?? post.comentario_destaque,
                        }
                        : post);
                    postsRef.current = proximo;
                    return proximo;
                });
                return;
            }
            if (tipo === "COMENTARIO_ATUALIZADO") {
                const dados = payload as ComentarioAtualizadoWS;
                setPosts((atual) => {
                    const proximo = atual.map((post) => post.id === dados.avaliacao_id
                        ? {
                            ...post,
                            comentario_destaque: dados.comentario_destaque ?? post.comentario_destaque,
                        }
                        : post);
                    postsRef.current = proximo;
                    return proximo;
                });
            }
        });
    }, [subscribe]);
    const removerDoFeed = useCallback((avaliacaoId: number) => {
        setPosts((atual) => {
            const proximo = atual.filter((post) => post.id !== avaliacaoId);
            postsRef.current = proximo;
            return proximo;
        });
    }, []);
    useEffect(() => {
        if (!nextCursor || carregando || carregandoMais || posts.length === 0)
            return;
        const observador = new IntersectionObserver((entradas) => {
            const [entrada] = entradas;
            if (entrada.isIntersecting && nextCursorRef.current && !restaurandoRef.current) {
                carregarFeed(nextCursorRef.current, true);
            }
        }, { rootMargin: "120px" });
        const alvo = document.getElementById("feed-lazy-sentinel");
        if (alvo)
            observador.observe(alvo);
        return () => observador.disconnect();
    }, [posts.length, nextCursor, carregando, carregandoMais, carregarFeed]);
    const abas = (<SeletorPilula className="mb-1" valor={aba} onChange={trocarAba} opcoes={[
            { valor: "forYou", rotulo: "Para você" },
            { valor: "seguindo", rotulo: "Seguindo" },
        ]}/>);
    if (carregando) {
        return (<div className="flex flex-col gap-4">
                {abas}
                {[1, 2, 3].map((item) => (<div key={item} className="h-48 animate-pulse rounded-2xl bg-white/70"/>))}
            </div>);
    }
    if (erro) {
        return (<div className="flex flex-col gap-4">
                {abas}
                <div className="rounded-2xl bg-white p-6 text-center">
                    <p className="font-gabarito-bold text-lg text-red-600">{erro}</p>
                </div>
            </div>);
    }
    if (posts.length === 0) {
        return (<div className="flex flex-col gap-4">
                {abas}
                <div className="rounded-2xl bg-white p-8 text-center">
                    <p className="font-gabarito-bold text-2xl text-azul-900">
                        {aba === "seguindo" ? "Nenhuma avaliação de quem você segue" : "Nenhuma avaliação ainda"}
                    </p>
                    <p className="mt-2 font-gabarito-regular text-cinza-700">
                        {aba === "seguindo"
                ? "Siga leitores para ver as avaliações deles aqui."
                : "Seja o primeiro a publicar uma avaliação na opinioteca."}
                    </p>
                </div>
            </div>);
    }
    return (<div className="flex flex-col gap-4">
            {abas}
            {posts.map((post) => (<div key={post.id} id={`feed-post-${post.id}`} data-feed-post-id={post.id}>
                    <PostCard post={post} onRemovido={removerDoFeed}/>
                </div>))}
            <div id="feed-lazy-sentinel" className="h-8"/>
            {carregandoMais && (<div className="flex flex-col gap-2">
                    <p className="text-center font-gabarito-regular text-sm text-cinza-700">Carregando...</p>
                    <div className="h-24 animate-pulse rounded-2xl bg-white/70"/>
                </div>)}
            {!nextCursor && posts.length > 0 && (<p className="py-2 text-center font-gabarito-regular text-sm text-cinza-700">Você chegou ao fim do feed.</p>)}
        </div>);
}
