"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { BuscaLivrosResposta, CriarLivroPayload, LivroBusca } from "@/types/livro";
import { BookPlus, Loader2, Search, Star, X } from "lucide-react";
import Image from "next/image";
import { FormEvent, useEffect, useRef, useState } from "react";

type NovaAvaliacaoModalProps = {
    open: boolean;
    onClose: () => void;
};

type DadosLivro = {
    livro_id?: number;
    google_volume_id?: string;
    titulo: string;
    autor: string;
    paginas: string;
    capa_url: string;
};

const DEBOUNCE_MS = 500;
const MIN_CARACTERES_BUSCA = 2;

const inputClassName =
    "w-full px-4 py-2 border-2 border-[#515151] rounded-full outline-none focus:border-azul-600 font-gabarito-regular bg-white";

const inputRetangularClassName =
    "w-full px-4 py-2 border-2 border-[#515151] rounded-2xl outline-none focus:border-azul-600 font-gabarito-regular bg-white";

function chaveLivro(livro: LivroBusca) {
    return `${livro.origem}-${livro.id ?? livro.google_volume_id}`;
}

function dadosDeLivroBusca(livro: LivroBusca): DadosLivro {
    return {
        livro_id: livro.id,
        google_volume_id: livro.google_volume_id,
        titulo: livro.titulo ?? "",
        autor: livro.autor ?? "",
        paginas: livro.paginas ? String(livro.paginas) : "",
        capa_url: livro.capa_url ?? "",
    };
}

function dadosVazios(tituloSugerido = ""): DadosLivro {
    return {
        titulo: tituloSugerido,
        autor: "",
        paginas: "",
        capa_url: "",
    };
}

function livroPrecisaCompletar(dados: DadosLivro) {
    return !dados.autor.trim() || !dados.capa_url.trim() || !dados.paginas.trim();
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

export default function NovaAvaliacaoModal({ open, onClose }: NovaAvaliacaoModalProps) {
    const [busca, setBusca] = useState("");
    const [resultados, setResultados] = useState<LivroBusca[]>([]);
    const [buscando, setBuscando] = useState(false);
    const [modoManual, setModoManual] = useState(false);
    const [dadosLivro, setDadosLivro] = useState<DadosLivro | null>(null);
    const [avisoBusca, setAvisoBusca] = useState("");
    const [nota, setNota] = useState(0);
    const [notaHover, setNotaHover] = useState(0);
    const [texto, setTexto] = useState("");
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
            setAvisoBusca("");
            setNota(0);
            setNotaHover(0);
            setTexto("");
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

                if (buscaRef.current.trim() !== termo) {
                    return;
                }

                if (!res.ok) {
                    setResultados([]);
                    if (termo.length >= MIN_CARACTERES_BUSCA) {
                        setAvisoBusca(
                            data.erro ||
                                "Não foi possível buscar agora. Tente de novo ou cadastre o livro manualmente.",
                        );
                    }
                    return;
                }

                const { resultados: itens, aviso } = parseBuscaResposta(data);
                setErro("");
                setResultados(itens);

                if (itens.length === 0 && aviso) {
                    setAvisoBusca(aviso);
                } else if (itens.length === 0) {
                    setAvisoBusca(`Nenhum livro encontrado para "${termo}".`);
                } else {
                    setAvisoBusca("");
                }
            } catch (err) {
                if (err instanceof DOMException && err.name === "AbortError") {
                    return;
                }
                if (buscaRef.current.trim() !== termo) {
                    return;
                }
                setResultados([]);
                setAvisoBusca("Não foi possível buscar agora. Tente de novo ou cadastre o livro manualmente.");
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
        setAvisoBusca("");
        setErro("");
    }

    function iniciarCadastroManual() {
        setModoManual(true);
        setDadosLivro(dadosVazios(busca.trim()));
        setResultados([]);
        setErro("");
    }

    function limparLivro() {
        setDadosLivro(null);
        setModoManual(false);
    }

    function atualizarDado(campo: keyof DadosLivro, valor: string) {
        setDadosLivro((atual) => (atual ? { ...atual, [campo]: valor } : atual));
    }

    async function registrarLivro(dados: DadosLivro): Promise<number> {
        const payload: CriarLivroPayload = {
            titulo: dados.titulo.trim(),
            autor: dados.autor.trim(),
        };

        if (dados.livro_id) payload.livro_id = dados.livro_id;
        if (dados.google_volume_id) payload.google_volume_id = dados.google_volume_id;
        if (dados.capa_url.trim()) payload.capa_url = dados.capa_url.trim();
        if (dados.paginas.trim()) {
            const paginas = Number(dados.paginas);
            if (!Number.isNaN(paginas) && paginas > 0) {
                payload.paginas = paginas;
            }
        }

        const res = await fetch("/api/livros", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.erro || "Não foi possível salvar o livro.");
        }

        if (!data.id) {
            throw new Error("Resposta inválida ao salvar o livro.");
        }

        return data.id as number;
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
        if (nota < 1 || nota > 5) {
            setErro("Selecione uma nota de 1 a 5.");
            return;
        }
        if (!texto.trim()) {
            setErro("Escreva o texto da resenha.");
            return;
        }

        setEnviando(true);
        try {
            const livroId = await registrarLivro(dadosLivro);

            const res = await fetch("/api/avaliacoes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ livro_id: livroId, nota, texto: texto.trim() }),
            });
            const data = await res.json();

            if (!res.ok) {
                setErro(data.erro || "Não foi possível publicar a resenha.");
                return;
            }

            window.dispatchEvent(new Event("feed:refresh"));
            onClose();
        } catch (err) {
            setErro(err instanceof Error ? err.message : "Não foi possível publicar a resenha.");
        } finally {
            setEnviando(false);
        }
    }

    const notaExibida = notaHover || nota;
    const exibirFormularioLivro = !!dadosLivro;
    const precisaCompletar = dadosLivro ? livroPrecisaCompletar(dadosLivro) : false;

    return (
        <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="font-gabarito-bold text-2xl text-azul-900">Nova Resenha</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    {!exibirFormularioLivro ? (
                        <div className="relative flex flex-col gap-3">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-cinza-700" />
                                <input
                                    type="text"
                                    value={busca}
                                    onChange={(e) => {
                                        setBusca(e.target.value);
                                        if (e.target.value.trim().length >= MIN_CARACTERES_BUSCA) {
                                            setBuscando(true);
                                        }
                                    }}
                                    placeholder="Buscar livro por título ou autor..."
                                    className={`${inputClassName} pl-10`}
                                    autoFocus
                                />
                                {buscando && (
                                    <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-azul-600" />
                                )}
                            </div>

                            {avisoBusca && !buscando && (
                                <p
                                    className={`rounded-2xl px-4 py-3 font-gabarito-regular text-sm ${
                                        resultados.length === 0
                                            ? "bg-amber-50 text-amber-900"
                                            : "bg-background text-cinza-700"
                                    }`}
                                >
                                    {avisoBusca}
                                </p>
                            )}

                            {busca.trim().length > 0 && busca.trim().length < MIN_CARACTERES_BUSCA && (
                                <p className="font-gabarito-regular text-sm text-cinza-700">
                                    Digite pelo menos {MIN_CARACTERES_BUSCA} caracteres para buscar.
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
                                                {livro.capa_url ? (
                                                    <Image
                                                        src={livro.capa_url}
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
                                                    <p className="truncate font-gabarito-bold text-sm text-azul-900">{livro.titulo}</p>
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
                        <div className="flex flex-col gap-4 rounded-2xl bg-background p-4">
                            <div className="flex items-center justify-between gap-2">
                                <p className="font-gabarito-bold text-base text-azul-900">
                                    {modoManual ? "Cadastro do livro" : "Dados do livro"}
                                </p>
                                <button
                                    type="button"
                                    onClick={limparLivro}
                                    className="shrink-0 rounded-full p-1 hover:bg-white"
                                    aria-label="Trocar livro"
                                >
                                    <X className="h-5 w-5 text-cinza-700" />
                                </button>
                            </div>

                            {precisaCompletar && (
                                <p className="font-gabarito-regular text-sm text-amber-800">
                                    Complete as informações que estiverem faltando antes de publicar.
                                </p>
                            )}

                            <div className="flex gap-3">
                                {dadosLivro.capa_url ? (
                                    <Image
                                        src={dadosLivro.capa_url}
                                        alt={dadosLivro.titulo || "Capa"}
                                        width={56}
                                        height={84}
                                        className="h-[84px] w-14 shrink-0 rounded-lg object-cover"
                                        unoptimized
                                    />
                                ) : (
                                    <div className="flex h-[84px] w-14 shrink-0 items-center justify-center rounded-lg bg-azul-200 text-xl">
                                        📖
                                    </div>
                                )}
                                <div className="flex min-w-0 flex-1 flex-col gap-2">
                                    <input
                                        type="text"
                                        value={dadosLivro.titulo}
                                        onChange={(e) => atualizarDado("titulo", e.target.value)}
                                        placeholder="Título *"
                                        className={inputRetangularClassName}
                                        required
                                    />
                                    <input
                                        type="text"
                                        value={dadosLivro.autor}
                                        onChange={(e) => atualizarDado("autor", e.target.value)}
                                        placeholder="Autor *"
                                        className={inputRetangularClassName}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <input
                                    type="number"
                                    min={1}
                                    value={dadosLivro.paginas}
                                    onChange={(e) => atualizarDado("paginas", e.target.value)}
                                    placeholder="Páginas"
                                    className={inputRetangularClassName}
                                />
                                <input
                                    type="url"
                                    value={dadosLivro.capa_url}
                                    onChange={(e) => atualizarDado("capa_url", e.target.value)}
                                    placeholder="URL da capa"
                                    className={inputRetangularClassName}
                                />
                            </div>
                        </div>
                    )}

                    <div>
                        <p className="mb-2 font-gabarito-bold text-sm text-azul-900">Sua nota</p>
                        <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((valor) => (
                                <button
                                    key={valor}
                                    type="button"
                                    onMouseEnter={() => setNotaHover(valor)}
                                    onMouseLeave={() => setNotaHover(0)}
                                    onClick={() => setNota(valor)}
                                    className="rounded p-0.5 transition hover:scale-110"
                                    aria-label={`Nota ${valor}`}
                                >
                                    <Star
                                        className={`h-7 w-7 ${
                                            valor <= notaExibida ? "fill-amber-400 text-amber-400" : "text-gray-300"
                                        }`}
                                    />
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label htmlFor="texto-resenha" className="mb-2 block font-gabarito-bold text-sm text-azul-900">
                            Sua resenha
                        </label>
                        <textarea
                            id="texto-resenha"
                            value={texto}
                            onChange={(e) => setTexto(e.target.value)}
                            rows={5}
                            placeholder="O que você achou do livro?"
                            className="w-full resize-none rounded-2xl border-2 border-[#515151] bg-white px-4 py-3 font-gabarito-regular outline-none focus:border-azul-600"
                        />
                    </div>

                    {erro && <p className="text-center font-gabarito-regular text-sm text-red-600">{erro}</p>}

                    <Button
                        type="submit"
                        disabled={enviando || !dadosLivro}
                        className="w-full rounded-full bg-azul-600 py-5 font-gabarito-bold text-lg text-white hover:bg-azul-700"
                    >
                        {enviando ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Publicando...
                            </>
                        ) : (
                            "Publicar resenha"
                        )}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
