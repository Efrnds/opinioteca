"use client";

import { mediaUrl } from "@/lib/media";
import { textoContemLink } from "@/lib/texto";
import { enviarImagemAvatar, validarArquivoImagem } from "@/lib/upload";
import { ImageIcon, Loader2, Send, X } from "lucide-react";
import { ChangeEvent, ClipboardEvent, FormEvent, useId, useState } from "react";

type GiphyGif = {
    id: string;
    images: {
        fixed_height: { url: string };
        original: { url: string };
    };
};

type ComentarioComposerProps = {
    placeholder?: string;
    enviando?: boolean;
    compacto?: boolean;
    onEnviar: (payload: { texto: string; anexoUrl?: string }) => Promise<void>;
};

export default function ComentarioComposer({
    placeholder = "Escreva um comentário...",
    enviando = false,
    compacto = false,
    onEnviar,
}: ComentarioComposerProps) {
    const [texto, setTexto] = useState("");
    const [erro, setErro] = useState("");
    const [arquivoImagem, setArquivoImagem] = useState<File | null>(null);
    const [previewImagem, setPreviewImagem] = useState<string | null>(null);
    const [showGifPicker, setShowGifPicker] = useState(false);
    const [termoGifBusca, setTermoGifBusca] = useState("");
    const [gifsGiphy, setGifsGiphy] = useState<GiphyGif[]>([]);
    const [buscandoGifs, setBuscandoGifs] = useState(false);
    const inputImagemId = useId();

    function limparAnexo() {
        if (previewImagem) URL.revokeObjectURL(previewImagem);
        setArquivoImagem(null);
        setPreviewImagem(null);
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

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if (enviando) return;

        const textoFinal = texto.trim();
        if (textoFinal && textoContemLink(textoFinal)) {
            setErro("Links não são permitidos em comentários.");
            return;
        }
        if (!textoFinal && !arquivoImagem) {
            setErro("Escreva algo ou anexe uma imagem.");
            return;
        }

        setErro("");
        try {
            let anexoUrl: string | undefined;
            if (arquivoImagem) {
                anexoUrl = await enviarImagemAvatar(arquivoImagem);
            }
            await onEnviar({ texto: textoFinal, anexoUrl });
            setTexto("");
            limparAnexo();
            setShowGifPicker(false);
        } catch (uploadErro) {
            setErro(uploadErro instanceof Error ? uploadErro.message : "Não foi possível enviar.");
        }
    }

    async function selecionarGif(url: string) {
        setShowGifPicker(false);
        setTermoGifBusca("");
        limparAnexo();
        setErro("");
        try {
            await onEnviar({ texto: "", anexoUrl: url });
            setTexto("");
        } catch (uploadErro) {
            setErro(uploadErro instanceof Error ? uploadErro.message : "Não foi possível enviar o GIF.");
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-2">
            {previewImagem && (
                <div className="relative w-fit">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewImagem} alt="Preview" className="h-16 w-16 rounded-xl object-cover" />
                    <button
                        type="button"
                        onClick={limparAnexo}
                        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-azul-900 text-white"
                        aria-label="Remover imagem"
                    >
                        <X className="h-3 w-3" />
                    </button>
                </div>
            )}

            <div className="relative rounded-2xl border border-white/70 bg-white/80 p-2 shadow-sm ring-1 ring-black/5 backdrop-blur-sm">
                {showGifPicker && (
                    <div className="absolute bottom-full left-0 z-50 mb-2 w-72 rounded-2xl border border-white/80 bg-white/95 p-3 shadow-lg backdrop-blur-md">
                        <input
                            type="text"
                            value={termoGifBusca}
                            onChange={e => {
                                setTermoGifBusca(e.target.value);
                                void buscarGifs(e.target.value.trim());
                            }}
                            placeholder="Buscar GIFs..."
                            className="mb-2 w-full rounded-full border border-cinza-200 bg-white px-3 py-1.5 font-gabarito-regular text-xs outline-none focus:border-azul-600"
                        />
                        <div className="grid max-h-48 grid-cols-3 gap-1.5 overflow-y-auto">
                            {buscandoGifs ? (
                                <div className="col-span-3 flex justify-center py-4">
                                    <Loader2 className="h-4 w-4 animate-spin text-azul-600" />
                                </div>
                            ) : gifsGiphy.length === 0 ? (
                                <p className="col-span-3 py-3 text-center font-gabarito-regular text-xs text-cinza-700">
                                    Nenhum GIF encontrado.
                                </p>
                            ) : (
                                gifsGiphy.map(gif => (
                                    <button
                                        key={gif.id}
                                        type="button"
                                        onClick={() => selecionarGif(gif.images.original.url)}
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
                    </div>
                )}

                <div className="flex items-center gap-1.5">
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
                            setShowGifPicker(v => !v);
                            if (!showGifPicker && gifsGiphy.length === 0) void buscarGifs("");
                        }}
                        className="rounded border border-azul-600 px-1 py-0.5 font-gabarito-bold text-[9px] text-azul-600"
                    >
                        GIF
                    </button>
                    <input
                        type="text"
                        value={texto}
                        onChange={e => setTexto(e.target.value)}
                        onPaste={(e: ClipboardEvent<HTMLInputElement>) => {
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
                        placeholder={placeholder}
                        className={`min-w-0 flex-1 bg-transparent font-gabarito-regular text-azul-900 outline-none placeholder:text-cinza-500 ${
                            compacto ? "text-xs" : "text-sm"
                        }`}
                    />
                    <button
                        type="submit"
                        disabled={enviando || (!texto.trim() && !arquivoImagem)}
                        className="rounded-full bg-azul-600 p-1.5 text-white transition hover:bg-azul-700 disabled:opacity-40"
                        aria-label="Enviar comentário"
                    >
                        {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </button>
                </div>
            </div>
            {erro && <p className="font-gabarito-regular text-xs text-red-600">{erro}</p>}
        </form>
    );
}

export function ComentarioMidia({ url, alt = "Anexo" }: { url?: string | null; alt?: string }) {
    if (!url) return null;
    const src = mediaUrl(url) ?? url;
    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="mt-2 max-h-48 max-w-full rounded-xl object-cover" loading="lazy" />
    );
}
