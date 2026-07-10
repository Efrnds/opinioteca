"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { EstanteItem } from "@/types/estante";
import { dadosDeLivroBusca } from "@/lib/livro-cadastro";
import { cn } from "@/lib/utils";
import ConviteResenhaModal from "@/app/components/ConviteResenhaModal";
import EstanteCarousel from "@/app/components/EstanteCarousel";
import NovaAvaliacaoModal from "@/app/components/NovaAvaliacaoModal";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, Loader2, Minus, Plus } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type RegistrarLeituraModalProps = {
    open: boolean;
    onClose: () => void;
};

type Passo = 1 | 2 | 3;

const PASSOS = [
    { id: 1 as const, rotulo: "Livro" },
    { id: 2 as const, rotulo: "Progresso" },
    { id: 3 as const, rotulo: "Confirmar" },
];

const slideVariants = {
    enter: (dir: number) => ({
        x: dir > 0 ? 48 : -48,
        opacity: 0,
    }),
    center: {
        x: 0,
        opacity: 1,
    },
    exit: (dir: number) => ({
        x: dir > 0 ? -48 : 48,
        opacity: 0,
    }),
};

function calcularPaginasDoDelta(novaPct: number, pctAtual: number, totalPaginas: number): number | null {
    if (novaPct <= pctAtual) return null;
    const diff = novaPct - pctAtual;
    if (totalPaginas <= 0) return 1;
    return Math.max(1, Math.round((diff / 100) * totalPaginas));
}

function CapaHero({
    livro,
    tamanho = "md",
}: {
    livro: EstanteItem["livro"];
    tamanho?: "sm" | "md" | "lg";
}) {
    const dims =
        tamanho === "lg"
            ? { w: 140, h: 210, className: "h-[210px] w-[140px]" }
            : tamanho === "md"
              ? { w: 96, h: 144, className: "h-36 w-24" }
              : { w: 64, h: 96, className: "h-24 w-16" };

    if (livro.capa_url) {
        return (
            <Image
                src={livro.capa_url}
                alt={livro.titulo}
                width={dims.w}
                height={dims.h}
                className={cn(dims.className, "shrink-0 rounded-xl object-cover shadow-lg ring-1 ring-black/5")}
                unoptimized
            />
        );
    }

    return (
        <div
            className={cn(
                dims.className,
                "flex shrink-0 items-center justify-center rounded-xl bg-azul-200 text-4xl shadow-lg",
            )}
        >
            📖
        </div>
    );
}

function IndicadorPassos({ passo }: { passo: Passo }) {
    return (
        <div className="flex items-center justify-center gap-2" aria-label={`Passo ${passo} de 3`}>
            {PASSOS.map((p, i) => {
                const ativo = p.id === passo;
                const feito = p.id < passo;
                return (
                    <div key={p.id} className="flex items-center gap-2">
                        {i > 0 && (
                            <div
                                className={cn(
                                    "h-px w-6 sm:w-8",
                                    feito || ativo ? "bg-azul-600" : "bg-cinza-200",
                                )}
                            />
                        )}
                        <div className="flex flex-col items-center gap-1">
                            <div
                                className={cn(
                                    "flex h-7 w-7 items-center justify-center rounded-full font-gabarito-bold text-xs transition-colors",
                                    feito && "bg-azul-600 text-white",
                                    ativo && "bg-azul-600 text-white ring-4 ring-azul-100",
                                    !feito && !ativo && "bg-cinza-200 text-cinza-700",
                                )}
                            >
                                {feito ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : p.id}
                            </div>
                            <span
                                className={cn(
                                    "hidden font-gabarito-medium text-[10px] uppercase tracking-wide sm:block",
                                    ativo || feito ? "text-azul-600" : "text-cinza-700",
                                )}
                            >
                                {p.rotulo}
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default function RegistrarLeituraModal({ open, onClose }: RegistrarLeituraModalProps) {
    const { data: session } = useSession();
    const nick = session?.user?.nick ?? "";

    const [estante, setEstante] = useState<EstanteItem[]>([]);
    const [carregandoEstante, setCarregandoEstante] = useState(false);
    const [passo, setPasso] = useState<Passo>(1);
    const [direcao, setDirecao] = useState(1);
    const [livroSelecionado, setLivroSelecionado] = useState<EstanteItem | null>(null);
    const [porcentagem, setPorcentagem] = useState(0);
    const [erro, setErro] = useState("");
    const [enviando, setEnviando] = useState(false);
    const [conviteResenhaAberto, setConviteResenhaAberto] = useState(false);
    const [livroConcluido, setLivroConcluido] = useState<EstanteItem["livro"] | null>(null);
    const [avaliacaoAberta, setAvaliacaoAberta] = useState(false);

    const carregarEstante = useCallback(async () => {
        if (!nick) {
            setEstante([]);
            return;
        }
        setCarregandoEstante(true);
        try {
            const res = await fetch(`/api/usuarios/${encodeURIComponent(nick)}/estante`);
            if (!res.ok) {
                setEstante([]);
                return;
            }
            const data = (await res.json()) as { livros?: EstanteItem[] };
            setEstante(Array.isArray(data.livros) ? data.livros : []);
        } catch {
            setEstante([]);
        } finally {
            setCarregandoEstante(false);
        }
    }, [nick]);

    useEffect(() => {
        if (open) {
            void carregarEstante();
        } else {
            setPasso(1);
            setDirecao(1);
            setLivroSelecionado(null);
            setPorcentagem(0);
            setErro("");
            setConviteResenhaAberto(false);
            setLivroConcluido(null);
            setAvaliacaoAberta(false);
        }
    }, [open, carregarEstante]);

    function irPara(proximo: Passo) {
        setDirecao(proximo > passo ? 1 : -1);
        setErro("");
        setPasso(proximo);
    }

    function selecionarLivro(item: EstanteItem) {
        setLivroSelecionado(item);
        const min = Math.min(100, Math.floor(item.porcentagem_atual) + 1);
        setPorcentagem(min);
        setErro("");
        setDirecao(1);
        setPasso(2);
    }

    function voltar() {
        if (passo === 2) {
            setLivroSelecionado(null);
            setPorcentagem(0);
            irPara(1);
            return;
        }
        if (passo === 3) {
            irPara(2);
        }
    }

    const pctAtualLivro = livroSelecionado?.porcentagem_atual ?? 0;
    const minPct = Math.min(100, Math.floor(pctAtualLivro) + 1);
    const totalPaginasLivro = livroSelecionado?.livro.paginas ?? 0;
    const paginasCalculadas = livroSelecionado
        ? calcularPaginasDoDelta(porcentagem, pctAtualLivro, totalPaginasLivro)
        : null;
    const pctValida = porcentagem > pctAtualLivro && porcentagem <= 100;

    function ajustarPct(delta: number) {
        setPorcentagem((atual) => Math.max(minPct, Math.min(100, atual + delta)));
        setErro("");
    }

    function validarProgresso(): boolean {
        if (!livroSelecionado) {
            setErro("Selecione um livro da sua estante.");
            return false;
        }
        if (!pctValida) {
            setErro(`Informe uma porcentagem maior que ${Math.round(pctAtualLivro)}%.`);
            return false;
        }
        if (paginasCalculadas === null || paginasCalculadas <= 0) {
            setErro("Não foi possível calcular as páginas lidas.");
            return false;
        }
        return true;
    }

    function avancarParaConfirmacao() {
        if (!validarProgresso()) return;
        irPara(3);
    }

    async function confirmarRegistro() {
        setErro("");
        if (!livroSelecionado || !validarProgresso()) return;

        const paginas = calcularPaginasDoDelta(
            porcentagem,
            livroSelecionado.porcentagem_atual,
            livroSelecionado.livro.paginas,
        );
        if (paginas === null || paginas <= 0) {
            setErro("Não foi possível calcular as páginas lidas.");
            return;
        }

        setEnviando(true);
        try {
            const res = await fetch("/api/diario", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    livro_id: livroSelecionado.livro.id,
                    paginas_lidas: paginas,
                    porcentagem_leitura: porcentagem,
                }),
            });
            const data = await res.json();

            if (!res.ok) {
                setErro(data.erro || "Não foi possível registrar a leitura.");
                return;
            }

            window.dispatchEvent(new Event("diario:refresh"));

            if (porcentagem >= 100 && !livroSelecionado.tem_resenha) {
                setLivroConcluido(livroSelecionado.livro);
                setConviteResenhaAberto(true);
                setPasso(1);
                setLivroSelecionado(null);
                setPorcentagem(0);
                void carregarEstante();
            } else {
                onClose();
            }
        } catch (err) {
            setErro(err instanceof Error ? err.message : "Não foi possível registrar a leitura.");
        } finally {
            setEnviando(false);
        }
    }

    const livroInicialAvaliacao = livroConcluido
        ? dadosDeLivroBusca({
              id: livroConcluido.id,
              titulo: livroConcluido.titulo,
              autor: livroConcluido.autor,
              paginas: livroConcluido.paginas,
              capa_url: livroConcluido.capa_url,
          })
        : null;

    const tituloPasso =
        passo === 1
            ? "O que você leu hoje?"
            : passo === 2
              ? "Até onde você chegou?"
              : "Tudo certo?";

    const subtituloPasso =
        passo === 1
            ? "Escolha um livro da sua estante e registre o momento."
            : passo === 2
              ? "Ajuste o progresso. Mostramos as páginas aproximadas."
              : "Confira o resumo e salve sua leitura de hoje.";

    return (
        <>
            <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
                <DialogContent
                    showCloseButton
                    className="flex h-[min(92vh,720px)] w-full max-w-full flex-col gap-0 overflow-hidden rounded-3xl border-0 bg-background p-0 sm:h-[min(88vh,680px)] sm:max-w-xl sm:rounded-[2rem]"
                >
                    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
                        <div
                            aria-hidden
                            className="pointer-events-none absolute inset-0 overflow-hidden"
                        >
                            <div className="absolute -left-20 -top-24 h-56 w-56 rounded-full bg-azul-100/80 blur-3xl" />
                            <div className="absolute -right-16 top-32 h-48 w-48 rounded-full bg-azul-50 blur-3xl" />
                            <div className="absolute bottom-0 left-1/3 h-40 w-64 rounded-full bg-azul-100/40 blur-3xl" />
                        </div>

                        <div className="relative z-10 flex shrink-0 flex-col gap-4 px-5 pb-2 pt-5 sm:px-7 sm:pt-6">
                            <div className="pr-8">
                                <p className="font-gabarito-medium text-[11px] uppercase tracking-[0.18em] text-azul-600">
                                    Registro de leitura
                                </p>
                                <DialogTitle className="mt-1 font-gabarito-bold text-2xl leading-tight text-azul-900 sm:text-[1.75rem]">
                                    {tituloPasso}
                                </DialogTitle>
                                <p className="mt-1 font-gabarito-regular text-sm text-cinza-700">
                                    {subtituloPasso}
                                </p>
                            </div>
                            <IndicadorPassos passo={passo} />
                        </div>

                        <div className="relative z-10 min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-7">
                            <AnimatePresence mode="wait" custom={direcao}>
                                <motion.div
                                    key={passo}
                                    custom={direcao}
                                    variants={slideVariants}
                                    initial="enter"
                                    animate="center"
                                    exit="exit"
                                    transition={{ type: "spring", stiffness: 380, damping: 34, mass: 0.85 }}
                                    className="flex min-h-full flex-col"
                                >
                                    {passo === 1 && (
                                        <div className="flex flex-1 flex-col justify-center gap-2 py-2">
                                            {carregandoEstante ? (
                                                <div className="flex flex-col items-center justify-center gap-3 py-16">
                                                    <Loader2 className="h-9 w-9 animate-spin text-azul-600" />
                                                    <p className="font-gabarito-regular text-sm text-cinza-700">
                                                        Abrindo sua estante...
                                                    </p>
                                                </div>
                                            ) : (
                                                <EstanteCarousel
                                                    livros={estante}
                                                    onSelecionar={selecionarLivro}
                                                    dica="Arraste ou toque no livro que você leu hoje"
                                                />
                                            )}
                                        </div>
                                    )}

                                    {passo === 2 && livroSelecionado && (
                                        <div className="flex flex-1 flex-col items-center gap-6 py-2">
                                            <motion.div
                                                initial={{ scale: 0.92, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                transition={{ type: "spring", stiffness: 320, damping: 24 }}
                                                className="flex flex-col items-center gap-3 text-center"
                                            >
                                                <CapaHero livro={livroSelecionado.livro} tamanho="lg" />
                                                <div className="max-w-[280px]">
                                                    <p className="line-clamp-2 font-gabarito-bold text-lg text-azul-900">
                                                        {livroSelecionado.livro.titulo}
                                                    </p>
                                                    <p className="font-gabarito-regular text-sm text-cinza-700">
                                                        {livroSelecionado.livro.autor}
                                                    </p>
                                                </div>
                                            </motion.div>

                                            <div className="w-full max-w-sm rounded-3xl bg-azul-50/80 px-5 py-6 ring-1 ring-azul-100">
                                                <div className="flex items-center justify-between gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => ajustarPct(-1)}
                                                        disabled={porcentagem <= minPct}
                                                        className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-azul-600 shadow-sm ring-1 ring-cinza-200 transition hover:bg-azul-50 disabled:opacity-40"
                                                        aria-label="Diminuir porcentagem"
                                                    >
                                                        <Minus className="h-5 w-5" />
                                                    </button>

                                                    <div className="flex flex-col items-center">
                                                        <span className="font-gabarito-black text-5xl leading-none tracking-tight text-azul-900 tabular-nums sm:text-6xl">
                                                            {porcentagem}
                                                            <span className="text-3xl text-azul-600 sm:text-4xl">%</span>
                                                        </span>
                                                        <span className="mt-2 font-gabarito-regular text-xs text-cinza-700">
                                                            antes: {Math.round(pctAtualLivro)}%
                                                        </span>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => ajustarPct(1)}
                                                        disabled={porcentagem >= 100}
                                                        className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-azul-600 shadow-sm ring-1 ring-cinza-200 transition hover:bg-azul-50 disabled:opacity-40"
                                                        aria-label="Aumentar porcentagem"
                                                    >
                                                        <Plus className="h-5 w-5" />
                                                    </button>
                                                </div>

                                                <div className="mt-5">
                                                    <input
                                                        type="range"
                                                        min={minPct}
                                                        max={100}
                                                        value={porcentagem}
                                                        onChange={(e) => {
                                                            setPorcentagem(Number(e.target.value));
                                                            setErro("");
                                                        }}
                                                        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-azul-200 accent-azul-600 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-azul-600 [&::-webkit-slider-thumb]:shadow-md"
                                                        aria-label="Porcentagem lida"
                                                    />
                                                    <div className="mt-1.5 flex justify-between font-gabarito-regular text-[10px] text-cinza-700">
                                                        <span>{minPct}%</span>
                                                        <span>100%</span>
                                                    </div>
                                                </div>

                                                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                                                    {[25, 50, 75, 100]
                                                        .filter((v) => v >= minPct)
                                                        .map((v) => (
                                                            <button
                                                                key={v}
                                                                type="button"
                                                                onClick={() => {
                                                                    setPorcentagem(v);
                                                                    setErro("");
                                                                }}
                                                                className={cn(
                                                                    "rounded-full px-3 py-1 font-gabarito-bold text-xs transition",
                                                                    porcentagem === v
                                                                        ? "bg-azul-600 text-white"
                                                                        : "bg-white text-azul-700 ring-1 ring-azul-200 hover:bg-azul-100",
                                                                )}
                                                            >
                                                                {v}%
                                                            </button>
                                                        ))}
                                                </div>
                                            </div>

                                            <div className="text-center">
                                                {paginasCalculadas !== null ? (
                                                    <p className="font-gabarito-bold text-base text-azul-900">
                                                        ≈ {paginasCalculadas}{" "}
                                                        {paginasCalculadas === 1 ? "página" : "páginas"} hoje
                                                    </p>
                                                ) : (
                                                    <p className="font-gabarito-regular text-sm text-cinza-700">
                                                        Avance além de {Math.round(pctAtualLivro)}% para registrar
                                                    </p>
                                                )}
                                                {totalPaginasLivro > 0 && (
                                                    <p className="mt-0.5 font-gabarito-regular text-xs text-cinza-700">
                                                        {totalPaginasLivro} páginas no total
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {passo === 3 && livroSelecionado && (
                                        <div className="flex flex-1 flex-col items-center justify-center gap-6 py-4">
                                            <motion.div
                                                initial={{ y: 12, opacity: 0 }}
                                                animate={{ y: 0, opacity: 1 }}
                                                transition={{ type: "spring", stiffness: 300, damping: 26 }}
                                                className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-lg ring-1 ring-cinza-200"
                                            >
                                                <div className="bg-gradient-to-br from-azul-600 to-azul-800 px-5 py-4 text-white">
                                                    <p className="font-gabarito-medium text-[11px] uppercase tracking-[0.16em] text-white/70">
                                                        Resumo do dia
                                                    </p>
                                                    <p className="mt-1 font-gabarito-bold text-lg">
                                                        Leitura registrada
                                                    </p>
                                                </div>

                                                <div className="flex gap-4 p-5">
                                                    <CapaHero livro={livroSelecionado.livro} tamanho="sm" />
                                                    <div className="min-w-0 flex-1">
                                                        <p className="line-clamp-2 font-gabarito-bold text-base text-azul-900">
                                                            {livroSelecionado.livro.titulo}
                                                        </p>
                                                        <p className="font-gabarito-regular text-xs text-cinza-700">
                                                            {livroSelecionado.livro.autor}
                                                        </p>

                                                        <div className="mt-3 grid grid-cols-2 gap-2">
                                                            <div className="rounded-2xl bg-azul-50 px-3 py-2">
                                                                <p className="font-gabarito-regular text-[10px] uppercase tracking-wide text-cinza-700">
                                                                    Progresso
                                                                </p>
                                                                <p className="font-gabarito-bold text-lg text-azul-900 tabular-nums">
                                                                    {Math.round(pctAtualLivro)}% → {porcentagem}%
                                                                </p>
                                                            </div>
                                                            <div className="rounded-2xl bg-azul-50 px-3 py-2">
                                                                <p className="font-gabarito-regular text-[10px] uppercase tracking-wide text-cinza-700">
                                                                    Páginas
                                                                </p>
                                                                <p className="font-gabarito-bold text-lg text-azul-900 tabular-nums">
                                                                    ≈ {paginasCalculadas ?? 0}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {porcentagem >= 100 && (
                                                            <p className="mt-3 font-gabarito-bold text-xs text-azul-600">
                                                                Você vai concluir este livro!
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        </div>
                                    )}
                                </motion.div>
                            </AnimatePresence>

                            {erro && (
                                <p className="mt-2 text-center font-gabarito-regular text-sm text-red-600">{erro}</p>
                            )}
                        </div>

                        {passo > 1 && (
                            <div className="relative z-10 shrink-0 border-t border-cinza-200/80 bg-background/90 px-5 py-4 backdrop-blur-sm sm:px-7">
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={voltar}
                                        disabled={enviando}
                                        className="rounded-full px-4 font-gabarito-bold text-azul-700"
                                    >
                                        <ArrowLeft className="mr-1 h-4 w-4" />
                                        Voltar
                                    </Button>

                                    {passo === 2 ? (
                                        <Button
                                            type="button"
                                            onClick={avancarParaConfirmacao}
                                            disabled={!pctValida}
                                            className="flex-1 rounded-full bg-azul-600 py-6 font-gabarito-bold text-base hover:bg-azul-700 disabled:opacity-50"
                                        >
                                            Continuar
                                        </Button>
                                    ) : (
                                        <Button
                                            type="button"
                                            onClick={() => void confirmarRegistro()}
                                            disabled={enviando || !pctValida}
                                            className="flex-1 rounded-full bg-azul-600 py-6 font-gabarito-bold text-base hover:bg-azul-700"
                                        >
                                            {enviando ? (
                                                <>
                                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                                    Salvando...
                                                </>
                                            ) : (
                                                "Salvar leitura"
                                            )}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <ConviteResenhaModal
                open={conviteResenhaAberto}
                livro={livroConcluido}
                onAceitar={() => {
                    setConviteResenhaAberto(false);
                    setAvaliacaoAberta(true);
                }}
                onDispensar={() => {
                    setConviteResenhaAberto(false);
                    setLivroConcluido(null);
                    onClose();
                }}
            />

            <NovaAvaliacaoModal
                open={avaliacaoAberta}
                livroInicial={livroInicialAvaliacao}
                onClose={() => {
                    setAvaliacaoAberta(false);
                    setLivroConcluido(null);
                    onClose();
                }}
            />
        </>
    );
}
