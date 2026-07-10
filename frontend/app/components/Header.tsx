"use client";

import { mediaUrl } from "@/lib/media";
import { itemAtivo, itensMenu } from "@/lib/nav";
import type { PesquisaResultado } from "@/types/pesquisa";
import { hrefLivroPesquisa, keyLivroPesquisa } from "@/types/pesquisa";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, Loader2, LogOut, Menu, Search, User } from "lucide-react";
import { signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useWebSocket } from "./WebSocketProvider";

export default function Header() {
    const pathname = usePathname();
    const { contagemNaoLidas, mensagensNaoLidasTotal } = useWebSocket();
    const [termo, setTermo] = useState("");
    const [resultados, setResultados] = useState<PesquisaResultado | null>(null);
    const [buscando, setBuscando] = useState(false);
    const [dropdownAberto, setDropdownAberto] = useState(false);
    const [buscaMobileAberta, setBuscaMobileAberta] = useState(false);
    const [menuAberto, setMenuAberto] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const buscaMobileRef = useRef<HTMLDivElement>(null);

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

    useEffect(() => {
        setMenuAberto(false);
        setBuscaMobileAberta(false);
    }, [pathname]);

    useEffect(() => {
        if (!menuAberto) return;

        function handleClickFora(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuAberto(false);
            }
        }
        function handleEsc(e: KeyboardEvent) {
            if (e.key === "Escape") setMenuAberto(false);
        }

        document.addEventListener("mousedown", handleClickFora);
        document.addEventListener("keydown", handleEsc);
        return () => {
            document.removeEventListener("mousedown", handleClickFora);
            document.removeEventListener("keydown", handleEsc);
        };
    }, [menuAberto]);

    useEffect(() => {
        if (!buscaMobileAberta) return;

        function handleClickFora(e: MouseEvent) {
            if (buscaMobileRef.current && !buscaMobileRef.current.contains(e.target as Node)) {
                setBuscaMobileAberta(false);
            }
        }
        function handleEsc(e: KeyboardEvent) {
            if (e.key === "Escape") setBuscaMobileAberta(false);
        }

        document.addEventListener("mousedown", handleClickFora);
        document.addEventListener("keydown", handleEsc);
        return () => {
            document.removeEventListener("mousedown", handleClickFora);
            document.removeEventListener("keydown", handleEsc);
        };
    }, [buscaMobileAberta]);

    async function handleSignOut() {
        await signOut({ callbackUrl: "/" });
    }

    function fecharBusca() {
        setDropdownAberto(false);
        setTermo("");
        setBuscaMobileAberta(false);
    }

    const temResultados = resultados && (resultados.usuarios.length > 0 || resultados.livros.length > 0);
    const mostrarDropdown = dropdownAberto && termo.trim().length > 0;
    const totalNaoLidasMenu = contagemNaoLidas + mensagensNaoLidasTotal;

    function renderResultados() {
        return (
            <>
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
                                onClick={fecharBusca}
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
                                onClick={fecharBusca}
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
                        onClick={fecharBusca}
                        className="block border-t border-cinza-100 px-4 py-3 font-gabarito-bold text-sm text-azul-600 transition hover:bg-background"
                    >
                        Ver todos os resultados para &quot;{termo.trim()}&quot;
                    </Link>
                )}
            </>
        );
    }

    return (
        <header className="sticky top-0 z-40 flex items-center justify-between gap-2 border-b-2 border-azul-900 bg-background/95 p-2.5 backdrop-blur-sm sm:p-3 md:gap-4 md:p-4">
            <Link href="/" className="flex min-w-0 items-center sm:min-w-40 lg:min-w-56 xl:min-w-72">
                <Image
                    src="/assets/images/Vector.svg"
                    width={200}
                    height={163}
                    alt="Logo da opinioteca"
                    className="logo-opinioteca h-7 w-fit sm:h-8 md:h-9"
                />
            </Link>

            <h1 className="hidden truncate font-gabarito-bold text-azul-900 xl:block xl:flex-1 xl:text-center xl:text-3xl 2xl:text-4xl">
                opinioteca
            </h1>

            <div ref={containerRef} className="relative hidden min-w-40 lg:block lg:min-w-56 xl:min-w-72">
                <div className="flex items-center justify-between gap-2 rounded-full border-4 border-transparent bg-white p-2 transition-all duration-300 focus-within:border-azul-600 [&:hover:not(:focus-within)]:border-cinza-700">
                    <input
                        type="text"
                        value={termo}
                        onChange={e => setTermo(e.target.value)}
                        onFocus={() => termo.trim() && setDropdownAberto(true)}
                        placeholder="Buscar usuários e livros..."
                        className="w-full bg-transparent pl-2 text-base text-black outline-none placeholder:text-cinza-700"
                    />
                    {buscando ? (
                        <Loader2 className="h-6 w-6 shrink-0 animate-spin text-cinza-700" />
                    ) : (
                        <Search className="h-6 w-6 shrink-0 text-black" />
                    )}
                </div>

                <AnimatePresence>
                    {mostrarDropdown && (
                        <motion.div
                            key="desktop-search-dropdown"
                            initial={{ opacity: 0, y: -6, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -6, scale: 0.98 }}
                            transition={{ duration: 0.15, ease: "easeOut" }}
                            className="absolute top-full z-50 mt-2 w-full origin-top overflow-hidden rounded-2xl border border-cinza-200 bg-white shadow-lg"
                        >
                            {renderResultados()}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="flex items-center gap-1 lg:hidden">
                <div ref={buscaMobileRef} className="relative">
                    <button
                        type="button"
                        onClick={() => setBuscaMobileAberta((v) => !v)}
                        className="flex rounded-full bg-white p-2"
                        aria-label="Buscar"
                        aria-expanded={buscaMobileAberta}
                    >
                        <Search className="h-5 w-5 text-azul-900" />
                    </button>

                    <AnimatePresence>
                        {buscaMobileAberta && (
                            <motion.div
                                key="mobile-search-dropdown"
                                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                                transition={{ duration: 0.15, ease: "easeOut" }}
                                className="absolute right-0 top-full z-50 mt-2 w-[min(90vw,22rem)] origin-top-right overflow-hidden rounded-2xl border border-cinza-200 bg-white shadow-lg"
                            >
                                <div className="flex items-center gap-2 border-b border-cinza-100 p-3">
                                    <Search className="h-5 w-5 shrink-0 text-cinza-700" />
                                    <input
                                        type="text"
                                        value={termo}
                                        onChange={e => setTermo(e.target.value)}
                                        placeholder="Buscar usuários e livros..."
                                        className="w-full min-w-0 bg-transparent text-base text-black outline-none placeholder:text-cinza-700"
                                        autoFocus
                                    />
                                    {buscando && <Loader2 className="h-5 w-5 shrink-0 animate-spin text-cinza-700" />}
                                </div>
                                {termo.trim().length > 0 && (
                                    <div className="max-h-80 overflow-y-auto">{renderResultados()}</div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div ref={menuRef} className="relative">
                    <button
                        type="button"
                        onClick={() => setMenuAberto((v) => !v)}
                        className="relative flex rounded-full bg-white p-2"
                        aria-label="Abrir menu"
                        aria-expanded={menuAberto}
                    >
                        <Menu className="h-5 w-5 text-azul-900" />
                        {totalNaoLidasMenu > 0 && (
                            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                                {totalNaoLidasMenu > 9 ? "9+" : totalNaoLidasMenu}
                            </span>
                        )}
                    </button>

                    <AnimatePresence>
                        {menuAberto && (
                            <motion.div
                                key="menu-hamburguer-dropdown"
                                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                                transition={{ duration: 0.15, ease: "easeOut" }}
                                className="absolute right-0 top-full z-50 mt-2 w-64 origin-top-right overflow-hidden rounded-2xl border border-cinza-200 bg-white p-2 shadow-lg"
                            >
                            <nav className="flex flex-col gap-1">
                                {itensMenu.map(({ href, rotulo, icone: Icone }) => {
                                    const ativo = itemAtivo(pathname, href);
                                    return (
                                        <Link
                                            key={href}
                                            href={href}
                                            onClick={() => setMenuAberto(false)}
                                            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 font-gabarito-bold text-base transition-colors ${
                                                ativo
                                                    ? "bg-background text-azul-600"
                                                    : "text-azul-900 hover:bg-background"
                                            }`}
                                            aria-current={ativo ? "page" : undefined}
                                        >
                                            <span className="relative shrink-0">
                                                <Icone className="h-5 w-5" strokeWidth={ativo ? 2.5 : 2} />
                                                {href === "/notificacoes" && contagemNaoLidas > 0 && (
                                                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white">
                                                        {contagemNaoLidas > 9 ? "9+" : contagemNaoLidas}
                                                    </span>
                                                )}
                                                {href === "/mensagens" && mensagensNaoLidasTotal > 0 && (
                                                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white">
                                                        {mensagensNaoLidasTotal > 9 ? "9+" : mensagensNaoLidasTotal}
                                                    </span>
                                                )}
                                            </span>
                                            {rotulo}
                                        </Link>
                                    );
                                })}
                                <div className="my-1 border-t border-cinza-100" />
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMenuAberto(false);
                                        handleSignOut();
                                    }}
                                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 font-gabarito-bold text-base text-red-600 transition hover:bg-background"
                                >
                                    <LogOut className="h-5 w-5" />
                                    Sair
                                </button>
                            </nav>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </header>
    );
}
