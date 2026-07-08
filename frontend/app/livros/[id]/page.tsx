"use client";

import NovaAvaliacaoModal from "@/app/components/NovaAvaliacaoModal";
import type { AvaliacaoFeed } from "@/types/avaliacao";
import { normalizarPostFeed } from "@/lib/avaliacao";
import CompartilharLivroModal from "@/app/components/CompartilharLivroModal";
import { iniciarCompartilharLivro } from "@/lib/compartilhar";
import { dadosDeLivroBusca } from "@/lib/livro-cadastro";
import { livroRegistrado } from "@/lib/livro-url";
import type { LivroBusca, LivroPublico } from "@/types/livro";
import { BookOpen, ChevronLeft, Loader2, Share2 } from "lucide-react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import Box from "../../components/Box";
import { useAuthGate } from "../../components/AuthGateProvider";
import PostCard from "../../components/PostCard";

type LivroDetalhe = LivroPublico | LivroBusca;

function ehLivroPublico(livro: LivroDetalhe): livro is LivroPublico {
    return !("origem" in livro);
}

function extrairGoogleVolumeId(livro: LivroDetalhe, identificador: string): string | undefined {
    if (ehLivroPublico(livro)) {
        return livro.google_volume_id;
    }
    return livro.google_volume_id || identificador;
}

export default function LivroPage() {
    const { exigirAuth } = useAuthGate();
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const identificador = params?.id ?? "";

    const [livro, setLivro] = useState<LivroDetalhe | null>(null);
    const [avaliacoes, setAvaliacoes] = useState<AvaliacaoFeed[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState("");
    const [modalAberto, setModalAberto] = useState(false);
    const [compartilharAberto, setCompartilharAberto] = useState(false);

    const registrado = livro ? livroRegistrado(livro) : false;
    const volumeId = livro ? extrairGoogleVolumeId(livro, identificador) : undefined;
    const livroId = livro && registrado ? livro.id : undefined;
    const dadosLivro = useMemo(() => (livro ? dadosDeLivroBusca(livro) : null), [livro]);

    const mediaAvaliacoes = useMemo(() => {
        if (avaliacoes.length === 0) return 0;
        const soma = avaliacoes.reduce((acc, avaliacao) => acc + avaliacao.nota, 0);
        return soma / avaliacoes.length;
    }, [avaliacoes]);

    const carregarLivro = useCallback(async () => {
        if (!identificador) {
            setErro("Livro inválido.");
            setCarregando(false);
            return;
        }

        try {
            const encoded = encodeURIComponent(identificador);
            const [resLivro, resAvaliacoes] = await Promise.all([
                fetch(`/api/livros/${encoded}`),
                fetch(`/api/livros/${encoded}/avaliacoes`),
            ]);
            const [dataLivro, dataAvaliacoes] = await Promise.all([resLivro.json(), resAvaliacoes.json()]);

            if (!resLivro.ok) {
                setLivro(null);
                setAvaliacoes([]);
                setErro(dataLivro.erro || "Não foi possível carregar o livro.");
                return;
            }

            setLivro(dataLivro as LivroDetalhe);
            if (!resAvaliacoes.ok) {
                setAvaliacoes([]);
            } else {
                const lista = Array.isArray(dataAvaliacoes) ? (dataAvaliacoes as AvaliacaoFeed[]) : [];
                setAvaliacoes(lista.map(normalizarPostFeed));
            }
            setErro("");
        } catch {
            setLivro(null);
            setAvaliacoes([]);
            setErro("Não foi possível carregar o livro.");
        } finally {
            setCarregando(false);
        }
    }, [identificador]);

    useEffect(() => {
        setCarregando(true);
        void carregarLivro();
    }, [carregarLivro]);

    useEffect(() => {
        function aoFocar() {
            if (!identificador || carregando) {
                return;
            }
            void carregarLivro();
        }

        window.addEventListener("focus", aoFocar);
        return () => window.removeEventListener("focus", aoFocar);
    }, [identificador, carregando, carregarLivro]);

    useEffect(() => {
        function aoRegistrar() {
            void carregarLivro();
        }

        window.addEventListener("livro:registrado", aoRegistrar);
        return () => window.removeEventListener("livro:registrado", aoRegistrar);
    }, [carregarLivro]);

    function fecharModal() {
        setModalAberto(false);
        void carregarLivro();
    }

    if (carregando) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-azul-600" />
            </div>
        );
    }

    if (erro || !livro) {
        return (
            <Box className="text-center">
                <p className="font-gabarito-bold text-lg text-red-600">{erro || "Livro não encontrado."}</p>
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="mt-4 font-gabarito-bold text-azul-600 hover:underline"
                >
                    Voltar
                </button>
            </Box>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <Box className="flex flex-col gap-3">
                <div className="flex items-center gap-2 border-b border-gray-300 pb-1">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="rounded-full p-1 text-azul-900 transition hover:bg-background"
                        aria-label="Voltar"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                    <h1 className="truncate font-gabarito-bold text-xl text-azul-900">{livro.titulo}</h1>
                </div>

                <div className="flex justify-between rounded-xl bg-[#3f3f42] p-4">
                    <div className="flex gap-4">
                        {livro.capa_url ? (
                            <Image
                                src={livro.capa_url}
                                alt={livro.titulo}
                                width={120}
                                height={180}
                                className="h-44 w-28 shrink-0 rounded-lg object-cover"
                                unoptimized
                            />
                        ) : (
                            <div className="flex h-44 w-28 shrink-0 items-center justify-center rounded-lg bg-azul-200 text-3xl">
                                📖
                            </div>
                        )}
                        <div className="min-w-0 self-end">
                            <p className="truncate font-gabarito-bold text-xl text-white">{livro.titulo}</p>
                            <p className="truncate font-gabarito-regular text-sm text-gray-200">{livro.autor}</p>
                        </div>
                    </div>
                    <div className="flex flex-1 flex-col items-end justify-between gap-2 text-gray-200">
                        <button
                            type="button"
                            onClick={() =>
                                void iniciarCompartilharLivro({
                                    titulo: livro.titulo,
                                    autor: livro.autor,
                                    livroId,
                                    volumeId,
                                }).then((acao) => {
                                    if (acao === "modal") {
                                        setCompartilharAberto(true);
                                    }
                                })
                            }
                            className="rounded-full p-1 transition hover:bg-white/10"
                            aria-label="Compartilhar livro"
                        >
                            <Share2 className="h-4 w-4" />
                        </button>

                        <div className="flex items-center gap-2">
                            <BookOpen className="h-5 w-5" />
                            <span className="font-gabarito-bold text-xl">{livro.paginas ?? "-"}</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-3 rounded-xl bg-background p-2">
                    <div className="text-center">
                        <p className="font-gabarito-bold text-xl text-azul-600">{avaliacoes.length}</p>
                        <p className="font-gabarito-bold text-[10px] text-azul-600">Resenhas</p>
                    </div>
                    <div className="border-x border-gray-300 text-center">
                        <p className="font-gabarito-bold text-xl text-amber-500">{mediaAvaliacoes.toFixed(2)}</p>
                        <p className="font-gabarito-bold text-[10px] text-amber-500">Média de avaliações</p>
                    </div>
                    <div className="flex items-center justify-center">
                        <button
                            type="button"
                            onClick={() => {
                                if (!exigirAuth()) return;
                                setModalAberto(true);
                            }}
                            className="rounded-full bg-azul-600 px-4 py-2 font-gabarito-bold text-sm text-white transition hover:bg-azul-700"
                        >
                            Escrever Avaliação
                        </button>
                    </div>
                </div>
            </Box>

            {avaliacoes.length === 0 ? (
                <Box className="text-center">
                    <p className="font-gabarito-bold text-xl text-azul-900">Nenhuma avaliação para este livro ainda.</p>
                    {!registrado && (
                        <p className="mt-2 font-gabarito-regular text-sm text-cinza-700">
                            Seja o primeiro a compartilhar sua opinião.
                        </p>
                    )}
                </Box>
            ) : (
                avaliacoes.map((avaliacao) => (
                    <PostCard
                        key={avaliacao.id}
                        post={avaliacao}
                        midiaComLightbox
                        onRemovido={(id) => setAvaliacoes((lista) => lista.filter((a) => a.id !== id))}
                    />
                ))
            )}

            <NovaAvaliacaoModal open={modalAberto} onClose={fecharModal} livroInicial={dadosLivro} />

            <CompartilharLivroModal
                open={compartilharAberto}
                onClose={() => setCompartilharAberto(false)}
                titulo={livro.titulo}
                autor={livro.autor}
                livroId={livroId}
                volumeId={volumeId}
            />
        </div>
    );
}
