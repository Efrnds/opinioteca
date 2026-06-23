"use client";

import type { AvaliacaoFeed } from "@/types/avaliacao";
import type { LivroPublico } from "@/types/livro";
import { BookOpen, ChevronLeft, Loader2, Share2 } from "lucide-react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Box from "../../components/Box";
import PostCard from "../../components/PostCard";

export default function LivroPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const livroID = Number(params?.id || 0);

    const [livro, setLivro] = useState<LivroPublico | null>(null);
    const [avaliacoes, setAvaliacoes] = useState<AvaliacaoFeed[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState("");

    const mediaAvaliacoes = useMemo(() => {
        if (avaliacoes.length === 0) return 0;
        const soma = avaliacoes.reduce((acc, avaliacao) => acc + avaliacao.nota, 0);
        return soma / avaliacoes.length;
    }, [avaliacoes]);

    useEffect(() => {
        async function carregarLivro() {
            if (!livroID) {
                setErro("Livro inválido.");
                setCarregando(false);
                return;
            }

            try {
                const [resLivro, resAvaliacoes] = await Promise.all([
                    fetch(`/api/livros/${livroID}`),
                    fetch(`/api/livros/${livroID}/avaliacoes`),
                ]);
                const [dataLivro, dataAvaliacoes] = await Promise.all([resLivro.json(), resAvaliacoes.json()]);

                if (!resLivro.ok) {
                    setErro(dataLivro.erro || "Não foi possível carregar o livro.");
                    return;
                }
                if (!resAvaliacoes.ok) {
                    setErro(dataAvaliacoes.erro || "Não foi possível carregar as avaliações do livro.");
                    return;
                }

                setLivro(dataLivro as LivroPublico);
                setAvaliacoes(Array.isArray(dataAvaliacoes) ? dataAvaliacoes : []);
                setErro("");
            } catch {
                setErro("Não foi possível carregar o livro.");
            } finally {
                setCarregando(false);
            }
        }

        carregarLivro();
    }, [livroID]);

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

                <div className=" rounded-xl flex justify-between bg-[#3f3f42] p-4">
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
                        <div className="min-w-0 self-end ">
                            <p className="truncate font-gabarito-bold text-xl text-white">{livro.titulo}</p>
                            <p className="truncate font-gabarito-regular text-sm text-gray-200">{livro.autor}</p>
                        </div>
                    </div>
                    <div className="flex-1 flex flex-col items-end justify-between gap-2 text-gray-200">
                        <Share2 className="h-4 w-4" />

                        <div className="flex gap-2 items-center">
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
                            onClick={() => router.push("/home")}
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
                </Box>
            ) : (
                avaliacoes.map(avaliacao => <PostCard key={avaliacao.id} post={avaliacao} />)
            )}
        </div>
    );
}
