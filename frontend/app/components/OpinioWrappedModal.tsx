"use client";

import type { OpinioWrapped } from "@/types/wrapped";
import {
    baixarImagemWrapped,
    compartilharImagemStories,
    copiarTextoWrapped,
    gerarImagemWrapped,
    podeCompartilharArquivo,
    textoCompartilharWrapped,
    urlWhatsAppWrapped,
} from "@/lib/wrapped-share";
import {
    WRAPPED_SHARE_GRADIENT_TAILWIND,
    anoDoPeriodo,
    formatarMes,
    formatarPeriodo,
} from "@/lib/wrapped-visuals";
import { AnimatePresence, motion } from "framer-motion";
import {
    BookOpen,
    ChevronLeft,
    ChevronRight,
    Copy,
    Download,
    Flame,
    MessageCircle,
    Share2,
    Sparkles,
    Star,
    X,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

import PlanoUpgradeModal from "./PlanoUpgradeModal";
import WrappedShareCard from "./WrappedShareCard";

type OpinioWrappedModalProps = {
    open: boolean;
    onClose: () => void;
};

type SlideDef = {
    id: string;
    kicker: string;
    titulo: string;
    descricao: string;
    gradiente: string;
    ghost?: string;
    decorVariant?: "intro" | "pages" | "books" | "streak" | "genre" | "star" | "calendar" | "share";
    conteudo: ReactNode;
    tipo?: "share";
};

function SlideDecorations({
    ghost,
    variant = "intro",
}: {
    ghost?: string;
    variant?: SlideDef["decorVariant"];
}) {
    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {/* mesh orbs */}
            <div className="absolute -left-16 -top-20 h-56 w-56 rounded-full bg-white/20 blur-3xl" />
            <div className="absolute -right-20 top-24 h-64 w-64 rounded-full bg-orange-400/25 blur-3xl" />
            <div className="absolute bottom-32 -left-10 h-48 w-48 rounded-full bg-fuchsia-400/20 blur-3xl" />
            <div className="absolute -bottom-16 right-0 h-72 w-72 rounded-full bg-violet-300/15 blur-3xl" />

            {/* geometric accents */}
            <div className="absolute right-8 top-28 h-14 w-14 rotate-12 rounded-2xl border border-white/10 bg-white/5" />
            <div className="absolute left-6 top-44 h-8 w-8 rounded-full border border-white/15 bg-white/8" />
            <div className="absolute bottom-40 right-10 h-6 w-6 rotate-45 border border-white/12 bg-white/6" />

            {/* dot grid */}
            <div
                className="absolute inset-0 opacity-[0.07]"
                style={{
                    backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)",
                    backgroundSize: "28px 28px",
                }}
            />

            {ghost ? (
                <p className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[42%] select-none font-gabarito-bold text-[9.5rem] leading-none tracking-tighter text-white/[0.055]">
                    {ghost}
                </p>
            ) : null}

            {variant === "intro" ? (
                <>
                    <motion.div
                        animate={{ y: [0, -10, 0], rotate: [0, 4, 0] }}
                        transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
                        className="absolute right-10 top-[38%] flex h-16 w-16 items-center justify-center rounded-2xl border border-white/12 bg-white/10 backdrop-blur-md"
                    >
                        <BookOpen className="h-8 w-8 text-white/80" />
                    </motion.div>
                    <motion.div
                        animate={{ y: [0, 12, 0], rotate: [0, -6, 0] }}
                        transition={{ repeat: Infinity, duration: 4.2, ease: "easeInOut", delay: 0.4 }}
                        className="absolute left-8 top-[32%] flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/8"
                    >
                        <Sparkles className="h-6 w-6 text-white/70" />
                    </motion.div>
                    <div className="absolute left-1/2 top-[46%] flex -translate-x-1/2 items-end gap-1">
                        {[0, 1, 2].map((i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.15 * i }}
                                className="rounded-md border border-white/15 bg-gradient-to-b from-white/20 to-white/5"
                                style={{ width: 28 + i * 6, height: 52 + i * 14 }}
                            />
                        ))}
                    </div>
                </>
            ) : null}

            {variant === "pages" ? (
                <>
                    {[0, 1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="absolute rounded-lg border border-white/10 bg-white/6"
                            style={{
                                width: 40 + i * 8,
                                height: 56 + i * 10,
                                left: `${12 + i * 18}%`,
                                top: `${28 + (i % 2) * 8}%`,
                                transform: `rotate(${-8 + i * 5}deg)`,
                                opacity: 0.35 - i * 0.05,
                            }}
                        />
                    ))}
                </>
            ) : null}

            {variant === "books" ? (
                <div className="absolute left-1/2 top-[30%] flex -translate-x-1/2 gap-2 opacity-30">
                    {[0, 1, 2, 3, 4].map((i) => (
                        <div
                            key={i}
                            className="rounded-sm border border-white/15 bg-white/10"
                            style={{ width: 18, height: 64 + i * 8, transform: `rotate(${-6 + i * 3}deg)` }}
                        />
                    ))}
                </div>
            ) : null}

            {variant === "streak" ? (
                <motion.div
                    animate={{ scale: [1, 1.08, 1], opacity: [0.15, 0.28, 0.15] }}
                    transition={{ repeat: Infinity, duration: 2.8, ease: "easeInOut" }}
                    className="absolute left-1/2 top-[32%] h-40 w-40 -translate-x-1/2 rounded-full bg-orange-300/20 blur-2xl"
                />
            ) : null}

            {variant === "genre" ? (
                <div className="absolute inset-x-0 top-[28%] flex justify-center gap-3 opacity-20">
                    {["◆", "●", "▲", "■"].map((shape) => (
                        <span key={shape} className="text-2xl text-white">
                            {shape}
                        </span>
                    ))}
                </div>
            ) : null}

            {variant === "star" ? (
                <Star className="absolute right-12 top-[34%] h-10 w-10 text-white/15" />
            ) : null}

            {variant === "calendar" ? (
                <div className="absolute left-1/2 top-[30%] grid -translate-x-1/2 grid-cols-7 gap-1 opacity-15">
                    {Array.from({ length: 21 }).map((_, i) => (
                        <div key={i} className={`h-3 w-3 rounded-sm ${i % 5 === 0 ? "bg-white/40" : "bg-white/15"}`} />
                    ))}
                </div>
            ) : null}
        </div>
    );
}

function InfoChip({ valor, rotulo }: { valor: string; rotulo: string }) {
    return (
        <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-white/14 bg-white/10 px-4 py-3 backdrop-blur-xl">
            <p className="font-gabarito-bold text-base text-white">{valor}</p>
            <p className="mt-0.5 text-[10px] uppercase tracking-[0.22em] text-white/60">{rotulo}</p>
        </div>
    );
}

function BottomInfoStrip({ items }: { items: { valor: string; rotulo: string }[] }) {
    return (
        <div className="mx-auto flex w-full max-w-xs gap-2">
            {items.map((item) => (
                <InfoChip key={item.rotulo} valor={item.valor} rotulo={item.rotulo} />
            ))}
        </div>
    );
}

function HeroRing({ children, className = "" }: { children: ReactNode; className?: string }) {
    return (
        <div
            className={`relative flex items-center justify-center rounded-full border border-white/18 bg-white/8 p-8 backdrop-blur-xl ${className}`}
        >
            <div className="absolute inset-3 rounded-full border border-dashed border-white/12" />
            {children}
        </div>
    );
}

function GenreBar({ nome, total, max, index }: { nome: string; total: number; max: number; index: number }) {
    const pct = max > 0 ? Math.round((total / max) * 100) : 0;
    return (
        <div className="w-full max-w-[17rem] text-left">
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
                <p className="font-gabarito-bold text-white">
                    <span className="text-white/45">{index + 1}.</span> {nome}
                </p>
                <p className="text-sm text-white/65">{total}</p>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, delay: index * 0.12, ease: "easeOut" }}
                    className="h-full rounded-full bg-gradient-to-r from-white/70 to-white/40"
                />
            </div>
        </div>
    );
}

function PreviewStoriesCard({ dados, nick }: { dados: OpinioWrapped; nick: string }) {
    const paginas = (dados.paginas_lidas ?? 0).toLocaleString("pt-BR");
    return (
        <div className="mx-auto w-[148px] shrink-0 rounded-[28px] border border-white/18 bg-white/10 p-2 shadow-2xl backdrop-blur-md">
            <div className={`relative aspect-[9/16] overflow-hidden rounded-[22px] bg-gradient-to-br ${WRAPPED_SHARE_GRADIENT_TAILWIND} p-3 text-white`}>
                <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-white/20 blur-xl" />
                <p className="relative text-[6px] uppercase tracking-[0.3em] text-white/75">OpinioWrapped</p>
                <p className="relative mt-6 text-center text-[18px] font-gabarito-bold leading-none">{paginas}</p>
                <p className="relative text-center text-[6px] text-white/70">páginas</p>
                <div className="relative mt-auto space-y-1 pt-8">
                    <div className="rounded-lg bg-white/14 px-2 py-1 text-center text-[8px] font-gabarito-bold">
                        {dados.livros_finalizados ?? 0} livros
                    </div>
                    <div className="rounded-lg bg-white/14 px-2 py-1 text-center text-[7px] font-gabarito-bold">
                        {dados.genero_favorito ?? dados.generos_favoritos?.[0]?.nome ?? "Leituras"}
                    </div>
                </div>
                <p className="relative mt-2 text-center text-[6px] text-white/65">@{nick}</p>
            </div>
        </div>
    );
}

function montarSlides(w: OpinioWrapped, nick: string): SlideDef[] {
    const paginasTotais = (w.paginas_lidas ?? 0).toLocaleString("pt-BR");
    const generoTop = w.genero_favorito ?? w.generos_favoritos?.[0]?.nome ?? "Variado";
    const livroTop = w.livro_destaque_detalhe?.titulo ?? w.livro_destaque ?? "—";
    const autorTop = w.livro_destaque_detalhe?.autor;
    const generos = (w.generos_favoritos ?? []).slice(0, 3);
    const maxGenero = Math.max(...generos.map((g) => g.total), 1);
    const anoGhost = anoDoPeriodo(w.periodo_fim);

    return [
        {
            id: "intro",
            kicker: formatarPeriodo(w.periodo_inicio, w.periodo_fim),
            titulo: "Seu OpinioWrapped.",
            descricao: "12 meses de leitura em um resumo.",
            gradiente: "from-[#0c0524] via-[#5b21b6] to-[#ea580c]",
            ghost: anoGhost,
            decorVariant: "intro",
            conteudo: (
                <div className="flex w-full flex-col items-center gap-8">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.5 }}
                        className="flex h-24 w-24 items-center justify-center rounded-[2rem] border border-white/18 bg-gradient-to-br from-white/22 to-white/6 shadow-2xl backdrop-blur-xl"
                    >
                        <Sparkles className="h-11 w-11 text-white" />
                    </motion.div>
                    <BottomInfoStrip
                        items={[
                            { valor: `@${nick}`, rotulo: "perfil" },
                            { valor: "12 meses", rotulo: "janela" },
                        ]}
                    />
                </div>
            ),
        },
        {
            id: "hero",
            kicker: "volume",
            titulo: `${paginasTotais}`,
            descricao: "páginas lidas nos últimos 12 meses.",
            gradiente: "from-[#020617] via-[#1d4ed8] to-[#7c3aed]",
            ghost: paginasTotais.replace(/\./g, ""),
            decorVariant: "pages",
            conteudo: (
                <HeroRing className="h-36 w-36">
                    <BookOpen className="h-14 w-14 text-white/90" />
                </HeroRing>
            ),
        },
        {
            id: "books",
            kicker: "conquistas",
            titulo: `${w.livros_finalizados ?? 0}`,
            descricao: `livro${(w.livros_finalizados ?? 0) === 1 ? "" : "s"} finalizado${(w.livros_finalizados ?? 0) === 1 ? "" : "s"} na sua estante.`,
            gradiente: "from-[#022c22] via-[#0d9488] to-[#4ade80]",
            ghost: String(w.livros_finalizados ?? 0),
            decorVariant: "books",
            conteudo: (
                <div className="flex w-full max-w-xs flex-col gap-3">
                    <BottomInfoStrip
                        items={[
                            { valor: `${w.dias_com_leitura ?? 0}`, rotulo: "dias ativos" },
                            { valor: `${w.registros ?? 0}`, rotulo: "registros" },
                        ]}
                    />
                </div>
            ),
        },
        {
            id: "streak",
            kicker: "consistência",
            titulo: `${w.maior_sequencia ?? 0}`,
            descricao: `dias seguidos · sequência atual: ${w.sequencia_atual ?? 0}.`,
            gradiente: "from-[#2e1065] via-[#c026d3] to-[#fb7185]",
            ghost: String(w.maior_sequencia ?? 0),
            decorVariant: "streak",
            conteudo: (
                <HeroRing className="h-32 w-32">
                    <Flame className="h-14 w-14 text-white" />
                </HeroRing>
            ),
        },
        {
            id: "genre",
            kicker: "gênero favorito",
            titulo: generoTop,
            descricao:
                (w.generos_favoritos?.[0]?.total ?? 0) > 0
                    ? `${w.generos_favoritos![0].total} livro${w.generos_favoritos![0].total === 1 ? "" : "s"} nesse gênero.`
                    : "Seu mix literário.",
            gradiente: "from-[#0f172a] via-[#3730a3] to-[#8b5cf6]",
            decorVariant: "genre",
            conteudo: (
                <div className="flex w-full flex-col items-center gap-4">
                    {generos.map((g, index) => (
                        <GenreBar key={g.nome} nome={g.nome} total={g.total} max={maxGenero} index={index} />
                    ))}
                </div>
            ),
        },
        {
            id: "book-highlight",
            kicker: "livro destaque",
            titulo: livroTop,
            descricao: autorTop ?? "O que mais marcou sua leitura.",
            gradiente: "from-[#0c1222] via-[#1e40af] to-[#4338ca]",
            decorVariant: "star",
            conteudo: (
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-white/16 bg-white/12 backdrop-blur-xl">
                    <Star className="h-10 w-10 fill-white/20 text-white" />
                </div>
            ),
        },
        {
            id: "best-month",
            kicker: "melhor mês",
            titulo: formatarMes(w.mes_mais_ativo),
            descricao: `${(w.paginas_mes_ativo ?? 0).toLocaleString("pt-BR")} páginas.`,
            gradiente: "from-[#3b0514] via-[#db2777] to-[#fb923c]",
            ghost: (w.paginas_mes_ativo ?? 0).toLocaleString("pt-BR").replace(/\./g, ""),
            decorVariant: "calendar",
            conteudo: (
                <div className="rounded-[2rem] border border-white/14 bg-white/10 px-8 py-5 backdrop-blur-xl">
                    <p className="text-5xl font-gabarito-bold leading-none text-white">
                        {(w.paginas_mes_ativo ?? 0).toLocaleString("pt-BR")}
                    </p>
                    <p className="mt-2 text-xs uppercase tracking-[0.24em] text-white/65">páginas no pico</p>
                </div>
            ),
        },
        {
            id: "share",
            kicker: "compartilhar",
            titulo: "Pronto para os Stories.",
            descricao: "Salve ou compartilhe seu card.",
            gradiente: WRAPPED_SHARE_GRADIENT_TAILWIND,
            decorVariant: "share",
            tipo: "share",
            conteudo: null,
        },
    ];
}

function IconInstagram({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2zm0 2A3.75 3.75 0 0 0 4 7.75v8.5A3.75 3.75 0 0 0 7.75 20h8.5a3.75 3.75 0 0 0 3.75-3.75v-8.5A3.75 3.75 0 0 0 16.25 4h-8.5zM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm5.25-2.9a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2z" />
        </svg>
    );
}

export default function OpinioWrappedModal({ open, onClose }: OpinioWrappedModalProps) {
    const { data: session } = useSession();
    const nick = session?.user?.nick ?? "";
    const [dados, setDados] = useState<OpinioWrapped | null>(null);
    const [slide, setSlide] = useState(0);
    const [ctaAberto, setCtaAberto] = useState(false);
    const [gerandoImagem, setGerandoImagem] = useState(false);
    const [suportaShareNativo] = useState(() => (typeof window !== "undefined" ? podeCompartilharArquivo() : false));
    const cardRef = useRef<HTMLDivElement>(null);

    const carregar = useCallback(async () => {
        if (!nick || !open) return;
        const res = await fetch(`/api/diario/${encodeURIComponent(nick)}/wrapped`);
        if (!res.ok) return;
        const json = (await res.json()) as OpinioWrapped;
        setDados(json);
        if (!json.disponivel) setCtaAberto(true);
        setSlide(0);
    }, [nick, open]);

    useEffect(() => {
        void carregar();
    }, [carregar]);

    const slides = useMemo(() => (dados?.disponivel ? montarSlides(dados, nick) : []), [dados, nick]);
    const total = slides.length;
    const atual = slides[slide];

    const avancar = useCallback(() => setSlide((s) => Math.min(s + 1, Math.max(total - 1, 0))), [total]);
    const voltar = useCallback(() => setSlide((s) => Math.max(s - 1, 0)), []);

    useEffect(() => {
        if (!open || total === 0) return;
        function onKey(e: KeyboardEvent) {
            if (e.key === "ArrowRight") avancar();
            if (e.key === "ArrowLeft") voltar();
            if (e.key === "Escape") onClose();
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, total, avancar, voltar, onClose]);

    const gerarImagem = useCallback(async () => {
        if (!cardRef.current) {
            toast.error("Não foi possível gerar a imagem.");
            return null;
        }
        setGerandoImagem(true);
        try {
            return await gerarImagemWrapped(cardRef.current);
        } catch {
            toast.error("Não foi possível gerar a imagem.");
            return null;
        } finally {
            setGerandoImagem(false);
        }
    }, []);

    const compartilharInstagram = useCallback(async () => {
        if (!dados || !nick) return;
        const dataUrl = await gerarImagem();
        if (!dataUrl) return;
        await compartilharImagemStories(dataUrl);
    }, [dados, nick, gerarImagem]);

    const baixarImagem = useCallback(async () => {
        const dataUrl = await gerarImagem();
        if (!dataUrl) return;
        await baixarImagemWrapped(dataUrl);
        toast.success("Imagem baixada!");
    }, [gerarImagem]);

    const compartilharWhatsApp = useCallback(() => {
        if (!dados || !nick) return;
        window.open(urlWhatsAppWrapped(textoCompartilharWrapped(dados, nick)), "_blank", "noopener,noreferrer");
    }, [dados, nick]);

    const copiarLink = useCallback(async () => {
        if (!dados || !nick) return;
        await copiarTextoWrapped(textoCompartilharWrapped(dados, nick));
    }, [dados, nick]);

    if (!open) return null;

    return (
        <>
            {dados?.disponivel ? <WrappedShareCard ref={cardRef} dados={dados} nick={nick} /> : null}

            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md" role="dialog">
                <div className="relative mx-auto flex h-full w-full max-w-md flex-col overflow-hidden bg-[#060816] shadow-2xl">
                    <button
                        type="button"
                        onClick={onClose}
                        className="absolute right-4 top-4 z-30 rounded-full border border-white/10 bg-black/25 p-2 text-white backdrop-blur-xl transition hover:bg-black/40"
                        aria-label="Fechar"
                    >
                        <X className="h-5 w-5" />
                    </button>

                    {dados?.disponivel && atual ? (
                        <>
                            <div className="absolute left-0 right-0 top-0 z-20 px-4 pt-4">
                                <div className="flex gap-1.5">
                                    {slides.map((item, index) => (
                                        <button
                                            key={item.id}
                                            type="button"
                                            aria-label={`Abrir slide ${index + 1}`}
                                            onClick={() => setSlide(index)}
                                            className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/18"
                                        >
                                            <span
                                                className={`block h-full rounded-full bg-white transition-all duration-300 ${
                                                    index <= slide ? "w-full" : "w-0"
                                                }`}
                                            />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button type="button" aria-label="Slide anterior" className="absolute inset-y-0 left-0 z-10 w-1/5" onClick={voltar} />
                            <button type="button" aria-label="Próximo slide" className="absolute inset-y-0 right-0 z-10 w-1/5" onClick={avancar} />

                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={atual.id}
                                    initial={{ opacity: 0, scale: 0.97, y: 14 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 1.02, y: -14 }}
                                    transition={{ duration: 0.38, ease: "easeOut" }}
                                    className={`relative flex h-full flex-col overflow-hidden bg-gradient-to-br ${atual.gradiente} px-5 pb-5 pt-14`}
                                >
                                    <SlideDecorations ghost={atual.ghost} variant={atual.decorVariant} />
                                    <div className="pointer-events-none absolute inset-3 rounded-[2rem] border border-white/10" />

                                    {/* top bar */}
                                    <div className="relative z-10 flex items-start justify-between gap-3 px-1">
                                        <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-white/70">{atual.kicker}</p>
                                        <p className="text-[11px] text-white/50">
                                            {slide + 1}/{total}
                                        </p>
                                    </div>

                                    {/* hero center */}
                                    <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-2 text-center">
                                        {atual.tipo === "share" && dados ? (
                                            <div className="w-full space-y-4">
                                                <div className="space-y-2 text-center">
                                                    <h2 className="text-[2rem] leading-tight font-gabarito-bold text-white">{atual.titulo}</h2>
                                                    <p className="text-sm text-white/75">{atual.descricao}</p>
                                                </div>
                                                <div className="flex justify-center">
                                                    <PreviewStoriesCard dados={dados} nick={nick} />
                                                </div>

                                                <button
                                                    type="button"
                                                    disabled={gerandoImagem}
                                                    onClick={() => void compartilharInstagram()}
                                                    className="flex w-full items-center justify-center gap-3 rounded-[1.35rem] bg-gradient-to-r from-fuchsia-600 via-violet-600 to-orange-500 px-4 py-4 font-gabarito-bold text-sm text-white shadow-xl transition hover:brightness-110 disabled:opacity-60"
                                                >
                                                    <IconInstagram className="h-5 w-5" />
                                                    {gerandoImagem
                                                        ? "Gerando arte..."
                                                        : suportaShareNativo
                                                          ? "Compartilhar nos Stories"
                                                          : "Gerar para Stories"}
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={compartilharWhatsApp}
                                                    className="flex w-full items-center justify-center gap-3 rounded-[1.35rem] bg-[#25D366] px-4 py-4 font-gabarito-bold text-sm text-white shadow-xl transition hover:brightness-110"
                                                >
                                                    <MessageCircle className="h-5 w-5" />
                                                    Compartilhar no WhatsApp
                                                </button>

                                                <div className="grid grid-cols-2 gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => void copiarLink()}
                                                        className="flex items-center justify-center gap-2 rounded-[1.25rem] border border-white/12 bg-white/10 px-3 py-3 text-sm text-white backdrop-blur-xl transition hover:bg-white/18"
                                                    >
                                                        <Copy className="h-4 w-4" />
                                                        Copiar texto
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={gerandoImagem}
                                                        onClick={() => void baixarImagem()}
                                                        className="flex items-center justify-center gap-2 rounded-[1.25rem] border border-white/12 bg-white/10 px-3 py-3 text-sm text-white backdrop-blur-xl transition hover:bg-white/18 disabled:opacity-60"
                                                    >
                                                        <Download className="h-4 w-4" />
                                                        Baixar PNG
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex w-full flex-col items-center gap-6">
                                                <div className="space-y-2">
                                                    <motion.h2
                                                        key={atual.titulo}
                                                        initial={{ opacity: 0, y: 12 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ duration: 0.45 }}
                                                        className="mx-auto max-w-[90%] text-[2.75rem] leading-[0.92] font-gabarito-bold text-white drop-shadow-lg"
                                                    >
                                                        {atual.titulo}
                                                    </motion.h2>
                                                    <p className="mx-auto max-w-[85%] text-sm leading-relaxed text-white/72">{atual.descricao}</p>
                                                </div>
                                                {atual.conteudo}
                                            </div>
                                        )}
                                    </div>

                                    {/* bottom nav */}
                                    <div className="relative z-10 flex items-center justify-between px-1 pt-2">
                                        <button
                                            type="button"
                                            onClick={voltar}
                                            disabled={slide === 0}
                                            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-white/10 text-white transition hover:bg-white/16 disabled:opacity-35"
                                        >
                                            <ChevronLeft className="h-5 w-5" />
                                        </button>

                                        <div className="flex items-center gap-2 text-white/55">
                                            {atual.tipo === "share" ? <Share2 className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                                            <span className="text-[10px] uppercase tracking-[0.24em]">
                                                {atual.tipo === "share" ? "compartilhar" : "continue"}
                                            </span>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={avancar}
                                            disabled={slide >= total - 1}
                                            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-white/10 text-white transition hover:bg-white/16 disabled:opacity-35"
                                        >
                                            <ChevronRight className="h-5 w-5" />
                                        </button>
                                    </div>
                                </motion.div>
                            </AnimatePresence>
                        </>
                    ) : (
                        <div className="flex h-full flex-col items-center justify-center gap-4 bg-gradient-to-br from-violet-950 via-[#120a39] to-[#0a1028] p-8 text-center text-white">
                            <motion.div
                                animate={{ rotate: [0, 8, -8, 0] }}
                                transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                            >
                                <Sparkles className="h-12 w-12 text-violet-300" />
                            </motion.div>
                            <p className="text-2xl font-gabarito-bold">OpinioWrapped</p>
                            <p className="text-sm text-white/80">{dados === null ? "Carregando seu relatório..." : "Preparando..."}</p>
                        </div>
                    )}
                </div>
            </div>

            <PlanoUpgradeModal
                open={ctaAberto}
                onClose={() => {
                    setCtaAberto(false);
                    onClose();
                }}
                recurso="opinioWrapped"
            />
        </>
    );
}
