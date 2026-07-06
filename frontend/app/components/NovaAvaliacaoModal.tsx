"use client";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { BuscaLivrosResposta, LivroBusca } from "@/types/livro";
import FormularioLivroCampos from "@/app/components/FormularioLivroCampos";
import { useCategoriasLivro } from "@/lib/hooks/useCategorias";
import {
    dadosDeLivroBusca,
    dadosLivroVazios,
    type DadosLivroForm,
    livroPrecisaCadastro,
    registrarLivroUsuario,
} from "@/lib/livro-cadastro";
import { textoContemLink } from "@/lib/texto";
import { enviarImagemAvatar, validarArquivoImagem } from "@/lib/upload";
import { AnimatePresence, motion } from "framer-motion";
import { BookPlus, ImageIcon, Loader2, Search, Star, X } from "lucide-react";
import Image from "next/image";
import { ChangeEvent, ClipboardEvent, FormEvent, useEffect, useId, useRef, useState } from "react";

type NovaAvaliacaoModalProps = {
    open: boolean;
    onClose: () => void;
    livroInicial?: DadosLivroForm | null;
};

const DEBOUNCE_MS = 500;
const MIN_CARACTERES_BUSCA = 2;

type GiphyGif = {
    id: string;
    images: {
        fixed_height: { url: string };
        original: { url: string };
    };
};

const inputClassName =
    "w-full px-4 py-2 border-2 border-[#515151] rounded-full outline-none focus:border-azul-600 font-gabarito-regular bg-white";

const inputRetangularClassName =
    "w-full px-4 py-2 border-2 border-[#515151] rounded-2xl outline-none focus:border-azul-600 font-gabarito-regular bg-white";

function chaveLivro(livro: LivroBusca) {
    return `${livro.origem}-${livro.id ?? livro.google_volume_id}`;
}

function livroPrecisaCompletar(dados: DadosLivroForm) {
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

export default function NovaAvaliacaoModal({ open, onClose, livroInicial = null }: NovaAvaliacaoModalProps) {
    const [busca, setBusca] = useState("");
    const [resultados, setResultados] = useState<LivroBusca[]>([]);
    const [buscando, setBuscando] = useState(false);
    const [modoManual, setModoManual] = useState(false);
    const [dadosLivro, setDadosLivro] = useState<DadosLivroForm | null>(null);
    const { categorias, carregando: carregandoCategorias } = useCategoriasLivro(open);
    const [avisoBusca, setAvisoBusca] = useState("");
    const [nota, setNota] = useState(0);
    const [notaHover, setNotaHover] = useState(0);
    const [texto, setTexto] = useState("");
    const [contemSpoiler, setContemSpoiler] = useState(false);
    const [arquivoImagem, setArquivoImagem] = useState<File | null>(null);
    const [previewImagem, setPreviewImagem] = useState<string | null>(null);
    const [anexoUrlDireto, setAnexoUrlDireto] = useState<string | null>(null);
    const [showGifPicker, setShowGifPicker] = useState(false);
    const [termoGifBusca, setTermoGifBusca] = useState("");
    const [gifsGiphy, setGifsGiphy] = useState<GiphyGif[]>([]);
    const [buscandoGifs, setBuscandoGifs] = useState(false);
    const [erro, setErro] = useState("");
    const [enviando, setEnviando] = useState(false);
    const inputImagemId = useId();
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
            setContemSpoiler(false);
            limparAnexo();
            setShowGifPicker(false);
            setErro("");
        }
    }, [open]);

    useEffect(() => {
        if (open && livroInicial) {
            setDadosLivro(livroInicial);
            setModoManual(false);
            setBusca("");
            setResultados([]);
            setAvisoBusca("");
            setErro("");
        }
    }, [open, livroInicial]);

    function limparAnexo() {
        if (previewImagem) URL.revokeObjectURL(previewImagem);
        setArquivoImagem(null);
        setPreviewImagem(null);
        setAnexoUrlDireto(null);
    }

    function definirArquivo(arquivo: File) {
        const erroValidacao = validarArquivoImagem(arquivo);
        if (erroValidacao) {
            setErro(erroValidacao);
            return;
        }
        limparAnexo();
        setArquivoImagem(arquivo);
        setPreviewImagem(URL.createObjectURL(arquivo));
        setErro("");
    }

    async function buscarGifs(termo: string) {
        setBuscandoGifs(true);
        try {
            const res = await fetch(`/api/gifs?q=${encodeURIComponent(termo)}`);
            if (res.ok) {
                const data = (await res.json()) as { data?: GiphyGif[] };
                setGifsGiphy(data.data ?? []);
            } else {
                setGifsGiphy([]);
            }
        } catch {
            setGifsGiphy([]);
        } finally {
            setBuscandoGifs(false);
        }
    }

    function selecionarGif(url: string) {
        limparAnexo();
        setAnexoUrlDireto(url);
        setShowGifPicker(false);
        setTermoGifBusca("");
        setErro("");
    }

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
        setDadosLivro(dadosLivroVazios(busca.trim()));
        setResultados([]);
        setErro("");
    }

    function limparLivro() {
        setDadosLivro(null);
        setModoManual(false);
    }

    function atualizarDado(campo: keyof DadosLivroForm, valor: string | number[]) {
        setDadosLivro((atual) => (atual ? { ...atual, [campo]: valor } : atual));
    }

    function validarDadosLivro(dados: DadosLivroForm) {
        if (!dados.titulo.trim() || !dados.autor.trim()) {
            return "Título e autor são obrigatórios.";
        }
        if (livroPrecisaCadastro(dados) && dados.categorias_ids.length === 0) {
            return "Selecione ao menos uma categoria para o livro.";
        }
        return "";
    }

    async function registrarLivro(dados: DadosLivroForm): Promise<number> {
        const validacao = validarDadosLivro(dados);
        if (validacao) {
            throw new Error(validacao);
        }
        return registrarLivroUsuario(dados);
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
        const textoFinal = texto.trim();
        if (textoFinal && textoContemLink(textoFinal)) {
            setErro("Links não são permitidos na resenha.");
            return;
        }
        if (!textoFinal && !arquivoImagem && !anexoUrlDireto) {
            setErro("Escreva a resenha ou anexe uma imagem.");
            return;
        }

        setEnviando(true);
        try {
            const livroId = await registrarLivro(dadosLivro);

            let anexoUrl: string | undefined;
            if (arquivoImagem) {
                anexoUrl = await enviarImagemAvatar(arquivoImagem);
            } else if (anexoUrlDireto) {
                anexoUrl = anexoUrlDireto;
            }

            const payload: Record<string, unknown> = {
                livro_id: livroId,
                nota,
                texto: textoFinal,
                contem_spoiler: contemSpoiler,
            };
            if (anexoUrl) payload.anexo_url = anexoUrl;

            const res = await fetch("/api/avaliacoes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json();

            if (!res.ok) {
                setErro(data.erro || "Não foi possível publicar a resenha.");
                return;
            }

            window.dispatchEvent(new Event("feed:refresh"));
            window.dispatchEvent(new CustomEvent("livro:registrado", { detail: { livroId } }));
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
            <DialogContent className="flex max-h-[92vh] w-full max-w-full flex-col gap-0 overflow-hidden rounded-3xl p-0 sm:max-h-[90vh] sm:max-w-lg sm:rounded-4xl">
                <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                    <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4 sm:p-6">
                        <DialogHeader>
                            <DialogTitle className="font-gabarito-bold text-2xl text-azul-900">Nova Resenha</DialogTitle>
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

                                <FormularioLivroCampos
                                    dados={dadosLivro}
                                    modoManual={modoManual}
                                    categorias={categorias}
                                    carregandoCategorias={carregandoCategorias}
                                    onChange={atualizarDado}
                                />
                            </div>
                        )}

                        {exibirFormularioLivro && (
                            <>
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
                                                        valor <= notaExibida
                                                            ? "fill-amber-400 text-amber-400"
                                                            : "text-gray-300"
                                                    }`}
                                                />
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between gap-3 rounded-2xl border border-cinza-200 bg-background px-4 py-3">
                                    <div>
                                        <p className="font-gabarito-bold text-sm text-azul-900">Contém spoiler</p>
                                        <p className="font-gabarito-regular text-xs text-cinza-700">
                                            Oculta texto e mídia no feed até o leitor escolher ver
                                        </p>
                                    </div>
                                    <Switch
                                        checked={contemSpoiler}
                                        onCheckedChange={setContemSpoiler}
                                        aria-label="Marcar resenha como contendo spoiler"
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="texto-resenha"
                                        className="mb-2 block font-gabarito-bold text-sm text-azul-900"
                                    >
                                        Sua resenha
                                    </label>
                                    <textarea
                                        id="texto-resenha"
                                        value={texto}
                                        onChange={(e) => setTexto(e.target.value)}
                                        onPaste={(e: ClipboardEvent<HTMLTextAreaElement>) => {
                                            const items = e.clipboardData?.items;
                                            if (!items) return;
                                            for (const item of items) {
                                                if (item.kind === "file" && item.type.startsWith("image/")) {
                                                    const arquivo = item.getAsFile();
                                                    if (!arquivo) continue;
                                                    e.preventDefault();
                                                    definirArquivo(arquivo);
                                                    return;
                                                }
                                            }
                                        }}
                                        rows={5}
                                        placeholder="O que você achou do livro? Você pode combinar texto com imagem ou GIF."
                                        className="w-full resize-none rounded-2xl border-2 border-[#515151] bg-white px-4 py-3 font-gabarito-regular outline-none focus:border-azul-600"
                                    />

                                    {(previewImagem || anexoUrlDireto) && (
                                        <div className="relative mt-3 w-fit">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={previewImagem ?? anexoUrlDireto ?? ""}
                                                alt="Preview"
                                                className="max-h-48 max-w-full rounded-xl object-contain"
                                            />
                                            <button
                                                type="button"
                                                onClick={limparAnexo}
                                                className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-azul-900 text-white"
                                                aria-label="Remover imagem"
                                            >
                                                <X className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    )}

                                    <div className="relative mt-2 rounded-2xl border border-cinza-200 bg-white p-2">
                                        <AnimatePresence>
                                            {showGifPicker && (
                                                <motion.div
                                                    key="gif-picker"
                                                    initial={{ opacity: 0, y: 6, scale: 0.98 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, y: 6, scale: 0.98 }}
                                                    transition={{ duration: 0.15, ease: "easeOut" }}
                                                    className="absolute bottom-full left-0 z-50 mb-2 w-full origin-bottom rounded-2xl border border-gray-200 bg-white p-3 shadow-lg"
                                                >
                                                    <input
                                                        type="text"
                                                        value={termoGifBusca}
                                                        onChange={(e) => {
                                                            setTermoGifBusca(e.target.value);
                                                            void buscarGifs(e.target.value.trim());
                                                        }}
                                                        placeholder="Buscar GIFs..."
                                                        className="mb-2 w-full rounded-full border border-cinza-200 px-3 py-1.5 font-gabarito-regular text-xs outline-none focus:border-azul-600"
                                                    />
                                                    <div className="grid max-h-40 grid-cols-3 gap-1.5 overflow-y-auto">
                                                        {buscandoGifs ? (
                                                            <div className="col-span-3 flex justify-center py-4">
                                                                <Loader2 className="h-4 w-4 animate-spin text-azul-600" />
                                                            </div>
                                                        ) : gifsGiphy.length === 0 ? (
                                                            <p className="col-span-3 py-3 text-center font-gabarito-regular text-xs text-cinza-700">
                                                                Nenhum GIF encontrado.
                                                            </p>
                                                        ) : (
                                                            gifsGiphy.map((gif) => (
                                                                <button
                                                                    key={gif.id}
                                                                    type="button"
                                                                    onClick={() =>
                                                                        selecionarGif(gif.images.original.url)
                                                                    }
                                                                    className="overflow-hidden rounded-lg"
                                                                >
                                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                    <img
                                                                        src={gif.images.fixed_height.url}
                                                                        alt="GIF"
                                                                        className="h-20 w-full object-cover"
                                                                    />
                                                                </button>
                                                            ))
                                                        )}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                        <div className="flex items-center gap-2">
                                            <input
                                                id={inputImagemId}
                                                type="file"
                                                accept="image/*,image/gif"
                                                className="hidden"
                                                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                                    const arquivo = e.target.files?.[0];
                                                    if (arquivo) definirArquivo(arquivo);
                                                    e.target.value = "";
                                                }}
                                            />
                                            <label
                                                htmlFor={inputImagemId}
                                                className="cursor-pointer rounded-full p-1.5 text-azul-600 transition hover:bg-azul-50"
                                                aria-label="Anexar imagem"
                                            >
                                                <ImageIcon className="h-4 w-4" />
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowGifPicker((v) => !v);
                                                    if (!showGifPicker && gifsGiphy.length === 0) void buscarGifs("");
                                                }}
                                                className="rounded border border-azul-600 px-1.5 py-0.5 font-gabarito-bold text-[10px] text-azul-600"
                                            >
                                                GIF
                                            </button>
                                            <span className="font-gabarito-regular text-xs text-cinza-600">
                                                Texto + imagem/GIF na mesma resenha
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {erro && (
                                    <p className="text-center font-gabarito-regular text-sm text-red-600">{erro}</p>
                                )}
                            </>
                        )}
                    </div>

                    {exibirFormularioLivro && (
                        <div className="shrink-0 border-t border-cinza-200 bg-background p-4 sm:p-6">
                            <Button
                                type="submit"
                                disabled={enviando}
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
                        </div>
                    )}
                </form>
            </DialogContent>
        </Dialog>
    );
}
