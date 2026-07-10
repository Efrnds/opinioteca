"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { BuscaLivrosResposta, LivroBusca } from "@/types/livro";
import type { StatusEstante } from "@/types/estante";
import { ROTULOS_STATUS_ESTANTE } from "@/types/estante";
import FormularioLivroCampos from "@/app/components/FormularioLivroCampos";
import { useCategoriasLivro } from "@/lib/hooks/useCategorias";
import {
    dadosDeLivroBusca,
    dadosLivroVazios,
    type DadosLivroForm,
    livroPrecisaCadastro,
    registrarLivroUsuario,
} from "@/lib/livro-cadastro";
import { mediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";
import { BookPlus, Loader2, Search } from "lucide-react";
import Image from "next/image";
import { FormEvent, useEffect, useRef, useState } from "react";

type AdicionarLivroEstanteModalProps = {
    open: boolean;
    onClose: () => void;
    nick: string;
    onAdicionado?: () => void;
};

const DEBOUNCE_MS = 500;
const MIN_CARACTERES_BUSCA = 2;

const inputClassName =
    "w-full px-4 py-2 border-2 border-[#515151] rounded-full outline-none focus:border-azul-600 font-gabarito-regular bg-white";

function chaveLivro(livro: LivroBusca) {
    return `${livro.origem}-${livro.id ?? livro.google_volume_id}`;
}

function parseBuscaResposta(data: unknown): BuscaLivrosResposta {
    if (Array.isArray(data)) {
        return { resultados: data };
    }
    if (data && typeof data === "object" && "resultados" in data) {
        const resposta = data as BuscaLivrosResposta;
        return {
            resultados: Array.isArray(resposta.resultados) ? resposta.resultados : [],
            aviso: resposta.aviso,
        };
    }
    return { resultados: [] };
}

export default function AdicionarLivroEstanteModal({
    open,
    onClose,
    nick,
    onAdicionado,
}: AdicionarLivroEstanteModalProps) {
    const [busca, setBusca] = useState("");
    const [resultados, setResultados] = useState<LivroBusca[]>([]);
    const [buscando, setBuscando] = useState(false);
    const [modoManual, setModoManual] = useState(false);
    const [dadosLivro, setDadosLivro] = useState<DadosLivroForm | null>(null);
    const [status, setStatus] = useState<StatusEstante>("quero_ler");
    const { categorias, carregando: carregandoCategorias } = useCategoriasLivro(open);
    const [avisoBusca, setAvisoBusca] = useState("");
    const [erro, setErro] = useState("");
    const [enviando, setEnviando] = useState(false);
    const buscaRef = useRef(busca);
    buscaRef.current = busca;

    useEffect(() => {
        if (!open) {
            setBusca("");
            setResultados([]);
            setModoManual(false);
            setDadosLivro(null);
            setStatus("quero_ler");
            setAvisoBusca("");
            setErro("");
        }
    }, [open]);

    useEffect(() => {
        if (!open || modoManual || dadosLivro) {
            return;
        }

        const termo = busca.trim();
        if (termo.length < MIN_CARACTERES_BUSCA) {
            setResultados([]);
            setAvisoBusca("");
            setBuscando(false);
            return;
        }

        const controller = new AbortController();
        const timer = setTimeout(async () => {
            setBuscando(true);
            setAvisoBusca("");
            try {
                const res = await fetch(`/api/livros/buscar?q=${encodeURIComponent(termo)}`, {
                    signal: controller.signal,
                });
                const data = await res.json();
                if (buscaRef.current.trim() !== termo) return;

                if (!res.ok) {
                    setResultados([]);
                    setAvisoBusca(data.erro || "Não foi possível buscar agora.");
                    return;
                }

                const { resultados: itens, aviso } = parseBuscaResposta(data);
                setResultados(itens);
                setAvisoBusca(itens.length === 0 ? aviso || `Nenhum livro encontrado para "${termo}".` : "");
            } catch (err) {
                if (err instanceof DOMException && err.name === "AbortError") return;
                setResultados([]);
                setAvisoBusca("Não foi possível buscar agora.");
            } finally {
                if (!controller.signal.aborted && buscaRef.current.trim() === termo) {
                    setBuscando(false);
                }
            }
        }, DEBOUNCE_MS);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [busca, open, modoManual, dadosLivro]);

    function selecionarLivro(livro: LivroBusca) {
        setDadosLivro(dadosDeLivroBusca(livro));
        setModoManual(false);
        setBusca("");
        setResultados([]);
        setErro("");
    }

    function iniciarCadastroManual() {
        setModoManual(true);
        setDadosLivro(dadosLivroVazios(busca.trim()));
        setResultados([]);
        setErro("");
    }

    function atualizarDado(campo: keyof DadosLivroForm, valor: string | number[]) {
        setDadosLivro((atual) => (atual ? { ...atual, [campo]: valor } : atual));
    }

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setErro("");

        if (!dadosLivro) {
            setErro("Selecione ou cadastre um livro.");
            return;
        }
        if (!dadosLivro.titulo.trim() || !dadosLivro.autor.trim()) {
            setErro("Título e autor são obrigatórios.");
            return;
        }
        if (livroPrecisaCadastro(dadosLivro) && dadosLivro.categorias_ids.length === 0) {
            setErro("Selecione ao menos uma categoria para o livro.");
            return;
        }

        setEnviando(true);
        try {
            const livroId = await registrarLivroUsuario(dadosLivro);
            const res = await fetch(`/api/usuarios/${encodeURIComponent(nick)}/estante`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ livro_id: livroId, status }),
            });
            const data = await res.json();
            if (!res.ok) {
                setErro(data.erro || "Não foi possível adicionar à estante.");
                return;
            }
            onAdicionado?.();
            onClose();
        } catch (err) {
            setErro(err instanceof Error ? err.message : "Não foi possível adicionar à estante.");
        } finally {
            setEnviando(false);
        }
    }

    const exibirFormulario = !!dadosLivro;

    return (
        <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
            <DialogContent className="flex max-h-[92vh] w-full max-w-full flex-col gap-0 overflow-hidden rounded-3xl p-0 sm:max-h-[90vh] sm:max-w-lg sm:rounded-4xl">
                <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                    <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4 sm:p-6">
                        <DialogHeader>
                            <DialogTitle className="font-gabarito-bold text-2xl text-azul-900">
                                Adicionar à estante
                            </DialogTitle>
                        </DialogHeader>

                        {!exibirFormulario ? (
                            <div className="flex flex-col gap-3">
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-cinza-700" />
                                    <input
                                        type="text"
                                        value={busca}
                                        onChange={(e) => setBusca(e.target.value)}
                                        placeholder="Buscar livro por título ou autor..."
                                        className={`${inputClassName} pl-10`}
                                        autoFocus
                                    />
                                    {buscando && (
                                        <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-azul-600" />
                                    )}
                                </div>

                                {avisoBusca && !buscando && (
                                    <p className="rounded-2xl bg-amber-50 px-4 py-3 font-gabarito-regular text-sm text-amber-900">
                                        {avisoBusca}
                                    </p>
                                )}

                                {resultados.length > 0 && (
                                    <ul className="max-h-64 overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-lg">
                                        {resultados.map((livro) => (
                                            <li key={chaveLivro(livro)}>
                                                <button
                                                    type="button"
                                                    onClick={() => selecionarLivro(livro)}
                                                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-background"
                                                >
                                                    {mediaUrl(livro.capa_url) ? (
                                                        <Image
                                                            src={mediaUrl(livro.capa_url)!}
                                                            alt={livro.titulo}
                                                            width={32}
                                                            height={48}
                                                            className="h-12 w-8 shrink-0 rounded object-cover"
                                                            unoptimized
                                                        />
                                                    ) : (
                                                        <div className="flex h-12 w-8 shrink-0 items-center justify-center rounded bg-azul-200 text-sm">
                                                            📖
                                                        </div>
                                                    )}
                                                    <div className="min-w-0">
                                                        <p className="truncate font-gabarito-bold text-sm text-azul-900">
                                                            {livro.titulo}
                                                        </p>
                                                        <p className="truncate font-gabarito-regular text-xs text-cinza-700">
                                                            {livro.autor || "Autor não informado"}
                                                        </p>
                                                    </div>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}

                                <button
                                    type="button"
                                    onClick={iniciarCadastroManual}
                                    className="flex items-center justify-center gap-2 rounded-full border-2 border-dashed border-azul-600 py-3 font-gabarito-bold text-azul-600 transition hover:bg-azul-50"
                                >
                                    <BookPlus className="h-5 w-5" />
                                    Cadastrar livro manualmente
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4">
                                <FormularioLivroCampos
                                    dados={dadosLivro}
                                    modoManual={modoManual}
                                    categorias={categorias}
                                    carregandoCategorias={carregandoCategorias}
                                    onChange={atualizarDado}
                                    exibirCamposCompletos={modoManual}
                                />

                                <div className="flex flex-col gap-2">
                                    <label className="font-gabarito-bold text-sm text-azul-900">Status na estante</label>
                                    <div className="flex flex-wrap gap-2">
                                        {(["quero_ler", "lendo", "lido"] as StatusEstante[]).map((valor) => (
                                            <button
                                                key={valor}
                                                type="button"
                                                onClick={() => setStatus(valor)}
                                                className={cn(
                                                    "rounded-full px-4 py-1.5 font-gabarito-bold text-xs transition",
                                                    status === valor
                                                        ? "bg-azul-600 text-white"
                                                        : "bg-gray-200 text-cinza-700 hover:bg-gray-300",
                                                )}
                                            >
                                                {ROTULOS_STATUS_ESTANTE[valor]}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {erro && <p className="font-gabarito-regular text-sm text-red-600">{erro}</p>}
                    </div>

                    {exibirFormulario && (
                        <div className="shrink-0 border-t border-cinza-200 bg-background p-4 sm:p-6">
                            <Button
                                type="submit"
                                disabled={enviando}
                                className="w-full rounded-full bg-azul-600 py-6 font-gabarito-bold text-lg hover:bg-azul-700"
                            >
                                {enviando ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Adicionando...
                                    </>
                                ) : (
                                    "Adicionar à estante"
                                )}
                            </Button>
                        </div>
                    )}
                </form>
            </DialogContent>
        </Dialog>
    );
}
