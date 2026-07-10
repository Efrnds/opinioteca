"use client";

import { mediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";
import type { LivroPublico } from "@/types/livro";
import { UserPlus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import Box from "./Box";
import BadgeRank from "./BadgeRank";
import MomentumCarousel, { type MomentumCarouselApi } from "./MomentumCarousel";

type UsuarioSugerido = {
    id: number;
    nome: string;
    nick: string;
    image?: string;
    rankConfiabilidade?: number;
};

type Variante = "pagina" | "lateral";

const CARD_PAGINA = { width: 112, gap: 12 } as const;
const CARD_LATERAL = { width: 44, gap: 6 } as const;

function CapaLivro({
    livro,
    compact,
    mini,
    carousel,
}: {
    livro: LivroPublico;
    compact?: boolean;
    mini?: boolean;
    carousel?: MomentumCarouselApi;
}) {
    const capa = mediaUrl(livro.capa_url);
    return (
        <Link
            href={`/livros/${livro.id}`}
            title={livro.titulo}
            onClick={carousel?.impedirCliqueSeArrastou}
            className={cn(
                "group flex shrink-0 flex-col",
                mini ? "w-11 gap-0" : compact ? "w-20 gap-1.5" : "w-28 gap-2",
                carousel?.arrastando && "pointer-events-none",
            )}
        >
            <div
                className={cn(
                    "relative w-full overflow-hidden bg-azul-200",
                    mini ? "aspect-[2/3] rounded-md" : "aspect-[2/3] rounded-lg",
                    carousel?.arrastando && "pointer-events-none",
                )}
            >
                {capa ? (
                    <Image
                        src={capa}
                        alt={livro.titulo}
                        fill
                        unoptimized
                        draggable={false}
                        className="pointer-events-none object-cover transition group-hover:scale-105"
                    />
                ) : (
                    <div
                        className={cn(
                            "pointer-events-none flex h-full items-center justify-center p-1 text-center font-gabarito-medium text-azul-700",
                            mini ? "text-[9px] leading-tight" : "p-2 text-xs",
                        )}
                    >
                        {livro.titulo}
                    </div>
                )}
            </div>
            {!mini && (
                <p
                    className={cn(
                        "pointer-events-none line-clamp-2 font-gabarito-medium text-azul-900",
                        compact ? "text-xs" : "text-sm",
                    )}
                >
                    {livro.titulo}
                </p>
            )}
        </Link>
    );
}

function SecaoLivros({
    titulo,
    url,
    variante,
}: {
    titulo: string;
    url: string;
    variante: Variante;
}) {
    const [livros, setLivros] = useState<LivroPublico[]>([]);
    const [carregando, setCarregando] = useState(true);
    const lateral = variante === "lateral";

    useEffect(() => {
        fetch(url)
            .then((r) => (r.ok ? r.json() : []))
            .then((data) => setLivros(Array.isArray(data) ? data : []))
            .catch(() => setLivros([]))
            .finally(() => setCarregando(false));
    }, [url]);

    return (
        <Box className={cn("flex flex-col", lateral ? "gap-1.5 !p-2.5" : "gap-4 !p-5")}>
            <div className="flex items-baseline justify-between gap-2">
                <h2
                    className={cn(
                        "font-gabarito-bold text-azul-900",
                        lateral ? "text-sm" : "text-2xl",
                    )}
                >
                    {titulo}
                </h2>
                {lateral && (
                    <Link
                        href="/explorar"
                        className="shrink-0 font-gabarito-medium text-xs text-azul-600 hover:text-azul-800"
                    >
                        Ver mais
                    </Link>
                )}
            </div>
            {carregando ? (
                <p className={cn("font-gabarito-regular text-cinza-600", lateral && "text-xs")}>
                    Carregando…
                </p>
            ) : livros.length === 0 ? (
                <p className={cn("font-gabarito-regular text-cinza-600", lateral && "text-xs")}>
                    Nada por aqui ainda.
                </p>
            ) : (
                <MomentumCarousel
                    itemCount={livros.length}
                    itemWidth={lateral ? CARD_LATERAL.width : CARD_PAGINA.width}
                    gap={lateral ? CARD_LATERAL.gap : CARD_PAGINA.gap}
                    className={lateral ? undefined : "pb-1"}
                >
                    {(carousel) =>
                        livros.map((livro) => (
                            <CapaLivro
                                key={livro.id}
                                livro={livro}
                                compact={lateral}
                                mini={lateral}
                                carousel={carousel}
                            />
                        ))
                    }
                </MomentumCarousel>
            )}
        </Box>
    );
}

function SecaoUsuariosSugeridos({ variante }: { variante: Variante }) {
    const [usuarios, setUsuarios] = useState<UsuarioSugerido[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [seguindo, setSeguindo] = useState<Set<string>>(new Set());
    const lateral = variante === "lateral";
    const limite = lateral ? 3 : 12;

    useEffect(() => {
        fetch(`/api/descoberta/usuarios/sugeridos?limite=${limite}`)
            .then((r) => (r.ok ? r.json() : []))
            .then((data) => setUsuarios(Array.isArray(data) ? data : []))
            .catch(() => setUsuarios([]))
            .finally(() => setCarregando(false));
    }, [limite]);

    async function seguir(nick: string) {
        const res = await fetch(`/api/usuarios/${encodeURIComponent(nick)}/seguir`, { method: "POST" });
        if (!res.ok && res.status !== 204) {
            toast.error("Não foi possível seguir.");
            return;
        }
        setSeguindo((prev) => new Set(prev).add(nick));
        toast.success(`Você agora segue @${nick}`);
    }

    return (
        <Box className={cn("flex flex-col", lateral ? "gap-1.5 !p-2.5" : "gap-4 !p-5")}>
            <div className="flex items-baseline justify-between gap-2">
                <h2
                    className={cn(
                        "font-gabarito-bold text-azul-900",
                        lateral ? "text-sm" : "text-2xl",
                    )}
                >
                    Pra seguir
                </h2>
                {lateral && (
                    <Link
                        href="/explorar"
                        className="shrink-0 font-gabarito-medium text-xs text-azul-600 hover:text-azul-800"
                    >
                        Ver mais
                    </Link>
                )}
            </div>
            {carregando ? (
                <p className={cn("font-gabarito-regular text-cinza-600", lateral && "text-xs")}>
                    Carregando…
                </p>
            ) : usuarios.length === 0 ? (
                <p className={cn("font-gabarito-regular text-cinza-600", lateral && "text-xs")}>
                    Sem sugestões no momento.
                </p>
            ) : (
                <ul className={cn("flex flex-col", lateral ? "gap-1.5" : "gap-3")}>
                    {usuarios.map((u) => {
                        const avatar = mediaUrl(u.image);
                        const jaSegue = seguindo.has(u.nick);
                        return (
                            <li key={u.id} className="flex items-center gap-1.5">
                                <Link
                                    href={`/perfil/${u.nick}`}
                                    className="flex min-w-0 flex-1 items-center gap-1.5"
                                >
                                    <div
                                        className={cn(
                                            "relative shrink-0 overflow-hidden rounded-full bg-azul-200",
                                            lateral ? "h-7 w-7" : "h-11 w-11",
                                        )}
                                    >
                                        {avatar ? (
                                            <Image src={avatar} alt="" fill unoptimized className="object-cover" />
                                        ) : (
                                            <span
                                                className={cn(
                                                    "flex h-full items-center justify-center font-gabarito-bold text-azul-700",
                                                    lateral && "text-xs",
                                                )}
                                            >
                                                {u.nick.slice(0, 1).toUpperCase()}
                                            </span>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p
                                            className={cn(
                                                "flex min-w-0 items-center gap-1 truncate font-gabarito-bold text-azul-900",
                                                lateral && "text-xs leading-tight",
                                            )}
                                        >
                                            <span className="truncate">{u.nome}</span>
                                            <BadgeRank rank={u.rankConfiabilidade} compact />
                                        </p>
                                        <p
                                            className={cn(
                                                "truncate font-gabarito-regular text-cinza-700",
                                                lateral ? "text-[10px] leading-tight" : "text-sm",
                                            )}
                                        >
                                            @{u.nick}
                                        </p>
                                    </div>
                                </Link>
                                <button
                                    type="button"
                                    disabled={jaSegue}
                                    onClick={() => void seguir(u.nick)}
                                    className={cn(
                                        "flex shrink-0 items-center gap-1 rounded-full bg-azul-600 font-gabarito-bold text-white hover:bg-azul-700 disabled:bg-cinza-400",
                                        lateral ? "px-2 py-0.5 text-[10px]" : "gap-1.5 px-3 py-1.5 text-sm",
                                    )}
                                >
                                    <UserPlus className={lateral ? "h-3 w-3" : "h-4 w-4"} />
                                    {jaSegue ? "Seguindo" : "Seguir"}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </Box>
    );
}

function SecaoCriticosEmAlta({ variante }: { variante: Variante }) {
    const [usuarios, setUsuarios] = useState<UsuarioSugerido[]>([]);
    const [carregando, setCarregando] = useState(true);
    const lateral = variante === "lateral";
    const limite = lateral ? 5 : 12;

    useEffect(() => {
        fetch(`/api/descoberta/usuarios/rank?limite=${limite}`)
            .then((r) => (r.ok ? r.json() : []))
            .then((data) => setUsuarios(Array.isArray(data) ? data : []))
            .catch(() => setUsuarios([]))
            .finally(() => setCarregando(false));
    }, [limite]);

    return (
        <Box className={cn("flex flex-col", lateral ? "gap-1.5 !p-2.5" : "gap-4 !p-5")}>
            <div className="flex items-baseline justify-between gap-2">
                <h2
                    className={cn(
                        "font-gabarito-bold text-azul-900",
                        lateral ? "text-sm" : "text-2xl",
                    )}
                >
                    Críticos em alta
                </h2>
                {lateral && (
                    <Link
                        href="/explorar"
                        className="shrink-0 font-gabarito-medium text-xs text-azul-600 hover:text-azul-800"
                    >
                        Ver mais
                    </Link>
                )}
            </div>
            {!lateral && (
                <p className="font-gabarito-regular text-sm text-cinza-700">
                    Rank de confiabilidade com base nos votos das resenhas (upvote +1, downvote −1).
                </p>
            )}
            {carregando ? (
                <p className={cn("font-gabarito-regular text-cinza-600", lateral && "text-xs")}>
                    Carregando…
                </p>
            ) : usuarios.length === 0 ? (
                <p className={cn("font-gabarito-regular text-cinza-600", lateral && "text-xs")}>
                    Ainda sem críticos ranqueados.
                </p>
            ) : (
                <ul className={cn("flex flex-col", lateral ? "gap-1.5" : "gap-3")}>
                    {usuarios.map((u, index) => {
                        const avatar = mediaUrl(u.image);
                        return (
                            <li key={u.id}>
                                <Link
                                    href={`/perfil/${u.nick}`}
                                    className="flex min-w-0 items-center gap-1.5"
                                >
                                    <span
                                        className={cn(
                                            "w-5 shrink-0 text-center font-gabarito-bold text-cinza-500",
                                            lateral ? "text-[10px]" : "text-sm",
                                        )}
                                    >
                                        {index + 1}
                                    </span>
                                    <div
                                        className={cn(
                                            "relative shrink-0 overflow-hidden rounded-full bg-azul-200",
                                            lateral ? "h-7 w-7" : "h-11 w-11",
                                        )}
                                    >
                                        {avatar ? (
                                            <Image src={avatar} alt="" fill unoptimized className="object-cover" />
                                        ) : (
                                            <span
                                                className={cn(
                                                    "flex h-full items-center justify-center font-gabarito-bold text-azul-700",
                                                    lateral && "text-xs",
                                                )}
                                            >
                                                {u.nick.slice(0, 1).toUpperCase()}
                                            </span>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p
                                            className={cn(
                                                "truncate font-gabarito-bold text-azul-900",
                                                lateral && "text-xs leading-tight",
                                            )}
                                        >
                                            {u.nome}
                                        </p>
                                        <p
                                            className={cn(
                                                "truncate font-gabarito-regular text-cinza-700",
                                                lateral ? "text-[10px] leading-tight" : "text-sm",
                                            )}
                                        >
                                            @{u.nick}
                                        </p>
                                    </div>
                                    <BadgeRank rank={u.rankConfiabilidade} ocultarSeZero={false} compact={lateral} />
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            )}
        </Box>
    );
}

type DescobertaSecoesProps = {
    variante?: Variante;
    className?: string;
    mostrarTitulo?: boolean;
};

export default function DescobertaSecoes({
    variante = "pagina",
    className,
    mostrarTitulo = true,
}: DescobertaSecoesProps) {
    const lateral = variante === "lateral";
    const limiteLivros = lateral ? 4 : 12;

    return (
        <div className={cn("flex w-full min-w-0 flex-col", lateral ? "gap-2" : "gap-6", className)}>
            {mostrarTitulo && (
                <div className={cn("flex items-end justify-between gap-2", lateral && "px-0.5")}>
                    <h1
                        className={cn(
                            "font-gabarito-bold text-azul-900",
                            lateral ? "text-xl leading-none" : "text-3xl",
                        )}
                    >
                        Explorar
                    </h1>
                    {lateral && (
                        <Link
                            href="/explorar"
                            className="shrink-0 font-gabarito-medium text-xs text-azul-600 hover:text-azul-800"
                        >
                            Ver tudo
                        </Link>
                    )}
                </div>
            )}
            <SecaoLivros
                titulo="Livros em alta"
                url={`/api/descoberta/livros/em-alta?limite=${limiteLivros}`}
                variante={variante}
            />
            <SecaoLivros
                titulo="Recentemente adicionados"
                url={`/api/descoberta/livros/recentes?limite=${limiteLivros}`}
                variante={variante}
            />
            <SecaoCriticosEmAlta variante={variante} />
            <SecaoUsuariosSugeridos variante={variante} />
        </div>
    );
}
