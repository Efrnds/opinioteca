"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { EstanteItem } from "@/types/estante";
import { dadosDeLivroBusca } from "@/lib/livro-cadastro";
import ConviteResenhaModal from "@/app/components/ConviteResenhaModal";
import EstanteCarousel from "@/app/components/EstanteCarousel";
import NovaAvaliacaoModal from "@/app/components/NovaAvaliacaoModal";
import { ArrowLeft, Loader2, X } from "lucide-react";
import Image from "next/image";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type RegistrarLeituraModalProps = {
    open: boolean;
    onClose: () => void;
};

const inputRetangularClassName =
    "w-full px-4 py-2 border-2 border-[#515151] rounded-2xl outline-none focus:border-azul-600 font-gabarito-regular bg-white";

export default function RegistrarLeituraModal({ open, onClose }: RegistrarLeituraModalProps) {
    const { data: session } = useSession();
    const nick = session?.user?.nick ?? "";

    const [estante, setEstante] = useState<EstanteItem[]>([]);
    const [carregandoEstante, setCarregandoEstante] = useState(false);
    const [livroSelecionado, setLivroSelecionado] = useState<EstanteItem | null>(null);
    const [paginasLidas, setPaginasLidas] = useState("");
    const [porcentagem, setPorcentagem] = useState("");
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
            setLivroSelecionado(null);
            setPaginasLidas("");
            setPorcentagem("");
            setErro("");
            setConviteResenhaAberto(false);
            setLivroConcluido(null);
            setAvaliacaoAberta(false);
        }
    }, [open, carregarEstante]);

    function selecionarLivro(item: EstanteItem) {
        setLivroSelecionado(item);
        setErro("");
        const pctAtual = Math.round(item.porcentagem_atual);
        setPorcentagem(String(pctAtual));
        setPaginasLidas("");
    }

    function voltarParaCarousel() {
        setLivroSelecionado(null);
        setPaginasLidas("");
        setPorcentagem("");
        setErro("");
    }

    function calcularPaginasSugeridas(novaPct: number) {
        const total = livroSelecionado?.livro.paginas ?? 0;
        const atual = livroSelecionado?.porcentagem_atual ?? 0;
        if (total <= 0 || novaPct <= atual) return "";
        const diff = novaPct - atual;
        return String(Math.max(1, Math.round((diff / 100) * total)));
    }

    function handlePorcentagemChange(valor: string) {
        setPorcentagem(valor);
        const novaPct = Number(valor);
        if (!Number.isNaN(novaPct) && novaPct > (livroSelecionado?.porcentagem_atual ?? 0)) {
            const sugeridas = calcularPaginasSugeridas(novaPct);
            if (sugeridas) {
                setPaginasLidas(sugeridas);
            }
        }
    }

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setErro("");

        if (!livroSelecionado) {
            setErro("Selecione um livro da sua estante.");
            return;
        }

        const paginas = Number(paginasLidas);
        if (!paginasLidas.trim() || Number.isNaN(paginas) || paginas <= 0) {
            setErro("Informe quantas páginas leu hoje (maior que zero).");
            return;
        }

        const pct = porcentagem.trim() === "" ? 0 : Number(porcentagem);
        if (Number.isNaN(pct) || pct < 0 || pct > 100) {
            setErro("A porcentagem deve estar entre 0 e 100.");
            return;
        }
        if (pct < livroSelecionado.porcentagem_atual) {
            setErro(`A porcentagem não pode ser menor que ${Math.round(livroSelecionado.porcentagem_atual)}%.`);
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
                    porcentagem_leitura: pct,
                }),
            });
            const data = await res.json();

            if (!res.ok) {
                setErro(data.erro || "Não foi possível registrar a leitura.");
                return;
            }

            window.dispatchEvent(new Event("diario:refresh"));

            if (pct >= 100 && !livroSelecionado.tem_resenha) {
                setLivroConcluido(livroSelecionado.livro);
                setConviteResenhaAberto(true);
                voltarParaCarousel();
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

    return (
        <>
            <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
                <DialogContent className="flex max-h-[92vh] w-full max-w-full flex-col gap-0 overflow-hidden rounded-3xl p-0 sm:max-h-[90vh] sm:max-w-lg sm:rounded-4xl">
                    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4 sm:p-6">
                            <DialogHeader>
                                <DialogTitle className="font-gabarito-bold text-2xl text-azul-900">
                                    Registrar leitura
                                </DialogTitle>
                            </DialogHeader>

                            {!livroSelecionado ? (
                                <div className="flex flex-col gap-4">
                                    {carregandoEstante ? (
                                        <div className="flex items-center justify-center py-12">
                                            <Loader2 className="h-8 w-8 animate-spin text-azul-600" />
                                        </div>
                                    ) : (
                                        <EstanteCarousel livros={estante} onSelecionar={selecionarLivro} />
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col gap-4 rounded-2xl bg-background p-4">
                                    <div className="flex items-center justify-between gap-2">
                                        <button
                                            type="button"
                                            onClick={voltarParaCarousel}
                                            className="flex items-center gap-1 font-gabarito-bold text-sm text-azul-600 hover:text-azul-800"
                                        >
                                            <ArrowLeft className="h-4 w-4" />
                                            Voltar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={voltarParaCarousel}
                                            className="rounded-full p-1 hover:bg-white"
                                            aria-label="Trocar livro"
                                        >
                                            <X className="h-5 w-5 text-cinza-700" />
                                        </button>
                                    </div>

                                    <div className="flex gap-3">
                                        {livroSelecionado.livro.capa_url ? (
                                            <Image
                                                src={livroSelecionado.livro.capa_url}
                                                alt={livroSelecionado.livro.titulo}
                                                width={64}
                                                height={96}
                                                className="h-24 w-16 shrink-0 rounded-lg object-cover"
                                                unoptimized
                                            />
                                        ) : (
                                            <div className="flex h-24 w-16 shrink-0 items-center justify-center rounded-lg bg-azul-200 text-2xl">
                                                📖
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <p className="line-clamp-2 font-gabarito-bold text-base text-azul-900">
                                                {livroSelecionado.livro.titulo}
                                            </p>
                                            <p className="font-gabarito-regular text-xs text-cinza-700">
                                                {livroSelecionado.livro.autor}
                                            </p>
                                            {livroSelecionado.livro.paginas > 0 && (
                                                <p className="mt-1 font-gabarito-regular text-xs text-cinza-700">
                                                    {livroSelecionado.livro.paginas} páginas no total
                                                </p>
                                            )}
                                            {livroSelecionado.porcentagem_atual > 0 && (
                                                <p className="mt-0.5 font-gabarito-bold text-xs text-azul-600">
                                                    Progresso atual: {Math.round(livroSelecionado.porcentagem_atual)}%
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="flex flex-col gap-1">
                                            <label className="font-gabarito-bold text-sm text-azul-900">
                                                Páginas lidas hoje
                                            </label>
                                            <input
                                                type="number"
                                                min={1}
                                                value={paginasLidas}
                                                onChange={(e) => setPaginasLidas(e.target.value)}
                                                placeholder="Ex: 25"
                                                className={inputRetangularClassName}
                                                required
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="font-gabarito-bold text-sm text-azul-900">% do livro</label>
                                            <input
                                                type="number"
                                                min={Math.round(livroSelecionado.porcentagem_atual)}
                                                max={100}
                                                value={porcentagem}
                                                onChange={(e) => handlePorcentagemChange(e.target.value)}
                                                placeholder="Ex: 40"
                                                className={inputRetangularClassName}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {erro && <p className="font-gabarito-regular text-sm text-red-600">{erro}</p>}
                        </div>

                        {livroSelecionado && (
                            <div className="shrink-0 border-t border-cinza-200 bg-background p-4 sm:p-6">
                                <Button
                                    type="submit"
                                    disabled={enviando}
                                    className="w-full rounded-full bg-azul-600 py-6 font-gabarito-bold text-lg hover:bg-azul-700"
                                >
                                    {enviando ? (
                                        <>
                                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                            Registrando...
                                        </>
                                    ) : (
                                        "Registrar leitura de hoje"
                                    )}
                                </Button>
                            </div>
                        )}
                    </form>
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
