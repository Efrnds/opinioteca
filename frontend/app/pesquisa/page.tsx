"use client";

import type { PesquisaResultado } from "@/types/pesquisa";
import { mediaUrl } from "@/lib/media";
import { hrefLivroPesquisa, keyLivroPesquisa } from "@/types/pesquisa";
import { BookOpen, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import AvatarUsuario from "../components/AvatarUsuario";
import Box from "../components/Box";

type Aba = "usuarios" | "livros";

function PesquisaConteudo() {
    const searchParams = useSearchParams();
    const termo = searchParams.get("q")?.trim() ?? "";
    const [aba, setAba] = useState<Aba>("usuarios");
    const [resultados, setResultados] = useState<PesquisaResultado | null>(null);
    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState("");

    useEffect(() => {
        if (!termo) {
            setResultados(null);
            return;
        }

        async function buscar() {
            setCarregando(true);
            setErro("");
            try {
                const res = await fetch(`/api/pesquisa?q=${encodeURIComponent(termo)}&limite=20`);
                if (!res.ok) {
                    setErro("Não foi possível carregar os resultados.");
                    return;
                }
                setResultados((await res.json()) as PesquisaResultado);
            } catch {
                setErro("Não foi possível carregar os resultados.");
            } finally {
                setCarregando(false);
            }
        }

        buscar();
    }, [termo]);

    if (!termo) {
        return (
            <Box className="p-8 text-center">
                <p className="font-gabarito-bold text-xl text-azul-900">Digite um termo na busca</p>
            </Box>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <Box className="p-4">
                <h1 className="font-gabarito-bold text-2xl text-azul-900">Resultados para &quot;{termo}&quot;</h1>
            </Box>

            <div className="flex rounded-2xl bg-white p-1 shadow-sm ring-1 ring-black/5">
                <button
                    type="button"
                    onClick={() => setAba("usuarios")}
                    className={`flex-1 rounded-xl px-4 py-2.5 font-gabarito-bold text-sm transition ${
                        aba === "usuarios" ? "bg-azul-600 text-white" : "text-cinza-700 hover:bg-background"
                    }`}
                >
                    Usuários {resultados ? `(${resultados.usuarios.length})` : ""}
                </button>
                <button
                    type="button"
                    onClick={() => setAba("livros")}
                    className={`flex-1 rounded-xl px-4 py-2.5 font-gabarito-bold text-sm transition ${
                        aba === "livros" ? "bg-azul-600 text-white" : "text-cinza-700 hover:bg-background"
                    }`}
                >
                    Livros {resultados ? `(${resultados.livros.length})` : ""}
                </button>
            </div>

            {carregando && (
                <Box className="flex items-center justify-center gap-2 p-8">
                    <Loader2 className="h-6 w-6 animate-spin text-azul-600" />
                    <span className="font-gabarito-regular text-cinza-700">Buscando...</span>
                </Box>
            )}

            {erro && (
                <Box className="p-6 text-center">
                    <p className="font-gabarito-bold text-red-600">{erro}</p>
                </Box>
            )}

            {!carregando && !erro && resultados && aba === "usuarios" && (
                <Box className="divide-y divide-cinza-100 p-2">
                    {resultados.usuarios.length === 0 ? (
                        <p className="p-4 font-gabarito-regular text-cinza-700">Nenhum usuário encontrado.</p>
                    ) : (
                        resultados.usuarios.map((usuario) => (
                            <Link
                                key={usuario.id}
                                href={`/perfil/${usuario.nick}`}
                                className="flex items-center gap-3 rounded-xl px-3 py-3 transition hover:bg-background"
                            >
                                <AvatarUsuario
                                    image={usuario.image}
                                    nome={usuario.nome}
                                    nick={usuario.nick}
                                    size={48}
                                    className="h-12 w-12"
                                />
                                <div className="min-w-0">
                                    <p className="truncate font-gabarito-bold text-base text-azul-900">{usuario.nome}</p>
                                    <p className="truncate font-gabarito-regular text-sm text-cinza-700">@{usuario.nick}</p>
                                </div>
                            </Link>
                        ))
                    )}
                </Box>
            )}

            {!carregando && !erro && resultados && aba === "livros" && (
                <Box className="divide-y divide-cinza-100 p-2">
                    {resultados.livros.length === 0 ? (
                        <p className="p-4 font-gabarito-regular text-cinza-700">Nenhum livro encontrado.</p>
                    ) : (
                        resultados.livros.map((livro, index) => (
                            <Link
                                key={keyLivroPesquisa(livro, index)}
                                href={hrefLivroPesquisa(livro)}
                                className="flex items-center gap-3 rounded-xl px-3 py-3 transition hover:bg-background"
                            >
                                {mediaUrl(livro.capa_url) ? (
                                    <Image
                                        src={mediaUrl(livro.capa_url)!}
                                        alt={livro.titulo}
                                        width={40}
                                        height={60}
                                        className="h-[60px] w-10 rounded object-cover"
                                        unoptimized
                                    />
                                ) : (
                                    <div className="flex h-[60px] w-10 items-center justify-center rounded bg-azul-100">
                                        <BookOpen className="h-5 w-5 text-azul-600" />
                                    </div>
                                )}
                                <div className="min-w-0">
                                    <p className="truncate font-gabarito-bold text-base text-azul-900">{livro.titulo}</p>
                                    <p className="truncate font-gabarito-regular text-sm text-cinza-700">{livro.autor}</p>
                                </div>
                            </Link>
                        ))
                    )}
                </Box>
            )}
        </div>
    );
}

export default function PesquisaPage() {
    return (
        <Suspense
            fallback={
                <Box className="flex items-center justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin text-azul-600" />
                </Box>
            }
        >
            <PesquisaConteudo />
        </Suspense>
    );
}
