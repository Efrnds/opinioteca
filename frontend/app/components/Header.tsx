"use client";

import { mediaUrl } from "@/lib/media";
import type { PesquisaResultado } from "@/types/pesquisa";
import { hrefLivroPesquisa, keyLivroPesquisa } from "@/types/pesquisa";
import { BookOpen, Loader2, Search, User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

export default function Header() {
    const [termo, setTermo] = useState("");
    const [resultados, setResultados] = useState<PesquisaResultado | null>(null);
    const [buscando, setBuscando] = useState(false);
    const [dropdownAberto, setDropdownAberto] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const buscar = useCallback(async (q: string) => {
        if (!q.trim()) {
            setResultados(null);
            setBuscando(false);
            return;
        }

        setBuscando(true);
        try {
            const res = await fetch(`/api/pesquisa?q=${encodeURIComponent(q.trim())}&limite=3`);
            if (res.ok) {
                const data = (await res.json()) as PesquisaResultado;
                setResultados(data);
            } else {
                setResultados({ usuarios: [], livros: [] });
            }
        } catch {
            setResultados({ usuarios: [], livros: [] });
        } finally {
            setBuscando(false);
        }
    }, []);

    useEffect(() => {
        if (!termo.trim()) {
            setResultados(null);
            setDropdownAberto(false);
            return;
        }

        setDropdownAberto(true);
        const timer = setTimeout(() => buscar(termo), 300);
        return () => clearTimeout(timer);
    }, [termo, buscar]);

    useEffect(() => {
        function handleClickFora(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setDropdownAberto(false);
            }
        }
        document.addEventListener("mousedown", handleClickFora);
        return () => document.removeEventListener("mousedown", handleClickFora);
    }, []);

    const temResultados = resultados && (resultados.usuarios.length > 0 || resultados.livros.length > 0);
    const mostrarDropdown = dropdownAberto && termo.trim().length > 0;

    return (
        <header className="flex items-center justify-between gap-2 border-b-2 border-azul-900 p-3 sm:gap-4 sm:p-4">
            <div className="flex min-w-0 items-center sm:min-w-48 lg:min-w-72">
                <Image
                    src="/assets/images/Vector.svg"
                    width={200}
                    height={163}
                    alt="Logo da opinioteca"
                    className="h-7 w-fit sm:h-9"
                />
            </div>
            <h1 className="truncate font-gabarito-bold text-2xl text-azul-900 sm:text-3xl lg:flex-1 lg:text-center lg:text-4xl">
                opinioteca
            </h1>
            <div ref={containerRef} className="relative hidden min-w-48 sm:block lg:min-w-72">
                <div className="flex items-center justify-between gap-2 rounded-full border-4 border-transparent bg-white p-2 transition-all duration-300 focus-within:border-azul-600 [&:hover:not(:focus-within)]:border-cinza-700">
                    <input
                        type="text"
                        value={termo}
                        onChange={e => setTermo(e.target.value)}
                        onFocus={() => termo.trim() && setDropdownAberto(true)}
                        placeholder="Buscar usuários e livros..."
                        className="w-full bg-transparent pl-2 text-black outline-none placeholder:text-cinza-700"
                    />
                    {buscando ? (
                        <Loader2 className="h-6 w-6 shrink-0 animate-spin text-cinza-700" />
                    ) : (
                        <Search className="h-6 w-6 shrink-0 text-black" />
                    )}
                </div>

                {mostrarDropdown && (
                    <div className="absolute top-full z-50 mt-2 w-full overflow-hidden rounded-2xl border border-cinza-200 bg-white shadow-lg">
                        {!buscando && !temResultados && (
                            <p className="px-4 py-3 font-gabarito-regular text-sm text-cinza-700">
                                Nenhum resultado encontrado.
                            </p>
                        )}
                        {resultados && resultados.usuarios.length > 0 && (
                            <div>
                                <p className="px-4 pb-1 pt-3 font-gabarito-bold text-xs uppercase tracking-wide text-cinza-500">
                                    Usuários
                                </p>
                                {resultados.usuarios.map(usuario => (
                                    <Link
                                        key={usuario.id}
                                        href={`/perfil/${usuario.nick}`}
                                        onClick={() => {
                                            setDropdownAberto(false);
                                            setTermo("");
                                        }}
                                        className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-background"
                                    >
                                        {usuario.image ? (
                                            <Image
                                                src={mediaUrl(usuario.image)!}
                                                alt={usuario.nome}
                                                width={32}
                                                height={32}
                                                className="h-8 w-8 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-azul-100">
                                                <User className="h-4 w-4 text-azul-600" />
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <p className="truncate font-gabarito-bold text-sm text-azul-900">
                                                {usuario.nome}
                                            </p>
                                            <p className="truncate font-gabarito-regular text-xs text-cinza-700">
                                                @{usuario.nick}
                                            </p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                        {resultados && resultados.livros.length > 0 && (
                            <div className={resultados.usuarios.length > 0 ? "border-t border-cinza-100" : ""}>
                                <p className="px-4 pb-1 pt-3 font-gabarito-bold text-xs uppercase tracking-wide text-cinza-500">
                                    Livros
                                </p>
                                {resultados.livros.map((livro, index) => (
                                    <Link
                                        key={keyLivroPesquisa(livro, index)}
                                        href={hrefLivroPesquisa(livro)}
                                        onClick={() => {
                                            setDropdownAberto(false);
                                            setTermo("");
                                        }}
                                        className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-background"
                                    >
                                        {livro.capa_url ? (
                                            <Image
                                                src={livro.capa_url}
                                                alt={livro.titulo}
                                                width={28}
                                                height={42}
                                                className="h-[42px] w-7 rounded object-cover"
                                                unoptimized
                                            />
                                        ) : (
                                            <div className="flex h-[42px] w-7 items-center justify-center rounded bg-azul-100">
                                                <BookOpen className="h-4 w-4 text-azul-600" />
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <p className="truncate font-gabarito-bold text-sm text-azul-900">
                                                {livro.titulo}
                                            </p>
                                            <p className="truncate font-gabarito-regular text-xs text-cinza-700">
                                                {livro.autor}
                                            </p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                        {termo.trim() && (
                            <Link
                                href={`/pesquisa?q=${encodeURIComponent(termo.trim())}`}
                                onClick={() => setDropdownAberto(false)}
                                className="block border-t border-cinza-100 px-4 py-3 font-gabarito-bold text-sm text-azul-600 transition hover:bg-background"
                            >
                                Ver todos os resultados para &quot;{termo.trim()}&quot;
                            </Link>
                        )}
                    </div>
                )}
            </div>
            <button type="button" className="flex rounded-full bg-white p-2 sm:hidden" aria-label="Buscar">
                <Search className="h-5 w-5 text-azul-900" />
            </button>
        </header>
    );
}
