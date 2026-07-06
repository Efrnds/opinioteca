"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { BuscaLivrosResposta, CriarLivroPayload, LivroBusca } from "@/types/livro";
import { BookPlus, Loader2, Search, X } from "lucide-react";
import Image from "next/image";
import { FormEvent, useEffect, useRef, useState } from "react";

type RegistrarLeituraModalProps = {
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

export default function RegistrarLeituraModal({ open, onClose }: RegistrarLeituraModalProps) {
    const [busca, setBusca] = useState("");
    const [resultados, setResultados] = useState<LivroBusca[]>([]);
    const [buscando, setBuscando] = useState(false);
    const [modoManual, setModoManual] = useState(false);
    const [dadosLivro, setDadosLivro] = useState<DadosLivro | null>(null);
    const [avisoBusca, setAvisoBusca] = useState("");
    const [paginasLidas, setPaginasLidas] = useState("");
    const [porcentagem, setPorcentagem] = useState("");
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
            setPaginasLidas("");
            setPorcentagem("");
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
                    setAvisoBusca(
                        data.erro || "Não foi possível buscar agora. Tente de novo ou cadastre o livro manualmente.",
                    );
                    return;
                }

                const { resultados: itens, aviso } = parseBuscaResposta(data);
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
        setBusca("");
        setResultados([]);
        setErro("");
    }

    async function registrarLivro(dados: DadosLivro): Promise<number> {
        if (dados.livro_id) {
            return dados.livro_id;
        }

        const payload: CriarLivroPayload = {
            titulo: dados.titulo.trim(),
            autor: dados.autor.trim(),
        };

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

        setEnviando(true);
        try {
            const livroId = await registrarLivro(dadosLivro);

            const res = await fetch("/api/diario", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    livro_id: livroId,
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
            onClose();
        } catch (err) {
            setErro(err instanceof Error ? err.message : "Não foi possível registrar a leitura.");
        } finally {
            setEnviando(false);
        }
    }

    const exibirFormularioLivro = !!dadosLivro;

    return (
        <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
            <DialogContent className="flex max-h-[92vh] w-full max-w-full flex-col gap-0 overflow-hidden rounded-3xl p-0 sm:max-h-[90vh] sm:max-w-lg sm:rounded-4xl">
                <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                    <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4 sm:p-6">
                        <DialogHeader>
                            <DialogTitle className="font-gabarito-bold text-2xl text-azul-900">
                                Registrar leitura
                            </DialogTitle>
                        </DialogHeader>

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
                                        {modoManual ? "Cadastro do livro" : dadosLivro.titulo}
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

                                {modoManual && (
                                    <>
                                        <input
                                            type="text"
                                            value={dadosLivro.titulo}
                                            onChange={(e) => setDadosLivro({ ...dadosLivro, titulo: e.target.value })}
                                            placeholder="Título"
                                            className={inputRetangularClassName}
                                        />
                                        <input
                                            type="text"
                                            value={dadosLivro.autor}
                                            onChange={(e) => setDadosLivro({ ...dadosLivro, autor: e.target.value })}
                                            placeholder="Autor"
                                            className={inputRetangularClassName}
                                        />
                                    </>
                                )}

                                {!modoManual && (
                                    <p className="font-gabarito-regular text-sm text-cinza-700">{dadosLivro.autor}</p>
                                )}

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="flex flex-col gap-1">
                                        <label className="font-gabarito-bold text-sm text-azul-900">Páginas lidas</label>
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
                                            min={0}
                                            max={100}
                                            value={porcentagem}
                                            onChange={(e) => setPorcentagem(e.target.value)}
                                            placeholder="Ex: 40"
                                            className={inputRetangularClassName}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {erro && <p className="font-gabarito-regular text-sm text-red-600">{erro}</p>}
                    </div>

                    {exibirFormularioLivro && (
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
    );
}
