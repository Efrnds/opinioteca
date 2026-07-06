"use client";

import type { AvaliacaoFeed } from "@/types/avaliacao";
import { normalizarPostFeed } from "@/lib/avaliacao";
import { ChevronLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Box from "../../components/Box";
import PostCard from "../../components/PostCard";

export default function AvaliacaoPage() {
    const params = useParams();
    const id = typeof params.id === "string" ? params.id : "";

    const [post, setPost] = useState<AvaliacaoFeed | null>(null);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState("");
    const [naoEncontrado, setNaoEncontrado] = useState(false);

    const carregar = useCallback(async () => {
        if (!id) {
            setNaoEncontrado(true);
            setCarregando(false);
            return;
        }

        setCarregando(true);
        setErro("");
        setNaoEncontrado(false);

        try {
            const res = await fetch(`/api/avaliacoes/${encodeURIComponent(id)}`);
            const data = await res.json();

            if (res.status === 404) {
                setPost(null);
                setNaoEncontrado(true);
                return;
            }

            if (!res.ok) {
                setErro(data.erro || "Não foi possível carregar a resenha.");
                return;
            }

            setPost(normalizarPostFeed(data as AvaliacaoFeed));
        } catch {
            setErro("Não foi possível carregar a resenha.");
        } finally {
            setCarregando(false);
        }
    }, [id]);

    useEffect(() => {
        void carregar();
    }, [carregar]);

    const voltarHref = post?.livro?.id ? `/livros/${post.livro.id}` : "/home";
    const voltarRotulo = post?.livro?.titulo ? "Voltar ao livro" : "Voltar";

    if (carregando) {
        return (
            <div className="flex flex-col gap-4">
                <div className="h-10 w-40 animate-pulse rounded-xl bg-white/70" />
                <div className="h-64 animate-pulse rounded-2xl bg-white/70" />
            </div>
        );
    }

    if (naoEncontrado) {
        return (
            <Box className="flex flex-col gap-4 text-center">
                <Link
                    href="/home"
                    className="inline-flex items-center gap-1 self-start font-gabarito-bold text-xl text-azul-900 transition hover:text-azul-600"
                >
                    <ChevronLeft className="h-6 w-6" />
                    Voltar
                </Link>
                <p className="font-gabarito-bold text-2xl text-azul-900">Resenha não encontrada</p>
                <p className="font-gabarito-regular text-sm text-cinza-700">
                    Esta avaliação pode ter sido removida ou não está mais disponível.
                </p>
            </Box>
        );
    }

    if (erro || !post) {
        return (
            <Box className="flex flex-col gap-4">
                <Link
                    href="/home"
                    className="inline-flex items-center gap-1 font-gabarito-bold text-xl text-azul-900 transition hover:text-azul-600"
                >
                    <ChevronLeft className="h-6 w-6" />
                    Voltar
                </Link>
                <p className="font-gabarito-bold text-lg text-red-600">{erro || "Não foi possível carregar a resenha."}</p>
                <button
                    type="button"
                    onClick={() => void carregar()}
                    className="self-start rounded-full bg-azul-600 px-4 py-2 font-gabarito-bold text-sm text-white transition hover:bg-azul-700"
                >
                    Tentar novamente
                </button>
            </Box>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <Link
                href={voltarHref}
                className="inline-flex items-center gap-1 font-gabarito-bold text-xl text-azul-900 transition hover:text-azul-600"
            >
                <ChevronLeft className="h-6 w-6" />
                {voltarRotulo}
            </Link>

            <PostCard
                post={post}
                ocultarLinkPost
                comentariosIniciaisAbertos
                onRemovido={() => {
                    setPost(null);
                    setNaoEncontrado(true);
                }}
            />
        </div>
    );
}
