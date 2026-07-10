"use client";

import {
    ehAvatarGif,
    gerarStillClient,
    limparCachePreviewAvatar,
    podeExibirAvatarGif,
} from "@/lib/avatar";
import { mediaUrl } from "@/lib/media";
import { enviarImagemAvatar, validarArquivoImagem } from "@/lib/upload";
import { Camera, Loader2, Lock } from "lucide-react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { useReducaoMovimentoPreferida } from "./AcessibilidadeProvider";
import PlanoUpgradeModal from "./PlanoUpgradeModal";
import { usePlano } from "./PlanoProvider";

type AvatarPerfilEditavelProps = {
    nome: string;
    nick: string;
    email: string;
    image?: string;
    banner?: string;
    bannerPosicao?: string;
    onAtualizado: (image?: string) => void;
};

function arquivoEhGif(arquivo: File) {
    return arquivo.type === "image/gif" || arquivo.name.toLowerCase().endsWith(".gif");
}

export default function AvatarPerfilEditavel({
    nome,
    nick,
    email,
    image,
    banner,
    bannerPosicao,
    onAtualizado,
}: AvatarPerfilEditavelProps) {
    const { update } = useSession();
    const { temPlanoPro: temPro } = usePlano();
    const inputId = useId();
    const inputRef = useRef<HTMLInputElement>(null);
    const [enviando, setEnviando] = useState(false);
    const [erro, setErro] = useState("");
    const [ctaGifAberto, setCtaGifAberto] = useState(false);
    const [stillClient, setStillClient] = useState<string | null>(null);
    const reducaoMovimentoAtiva = useReducaoMovimentoPreferida();

    const inicial = nome?.charAt(0).toUpperCase() || nick.charAt(0).toUpperCase();
    const avatarEhGif = Boolean(image && ehAvatarGif(image));
    const src = mediaUrl(image);
    const podeGifPorPlano = Boolean(image && podeExibirAvatarGif(image, undefined, undefined, temPro));
    const bloquearAnimacao = avatarEhGif && (reducaoMovimentoAtiva || !podeGifPorPlano);
    const exibirAnimado = Boolean(src && avatarEhGif && !bloquearAnimacao);

    useEffect(() => {
        if (!bloquearAnimacao || !src || !avatarEhGif) {
            setStillClient(null);
            return;
        }

        let cancelado = false;
        limparCachePreviewAvatar();
        void gerarStillClient(src).then((dataUrl) => {
            if (!cancelado && dataUrl) setStillClient(dataUrl);
        });

        return () => {
            cancelado = true;
        };
    }, [bloquearAnimacao, src, avatarEhGif]);

    async function handleArquivo(arquivo: File) {
        if (arquivoEhGif(arquivo) && !temPro) {
            setCtaGifAberto(true);
            return;
        }

        const erroValidacao = validarArquivoImagem(arquivo, { permitirGif: temPro });
        if (erroValidacao) {
            setErro(erroValidacao);
            return;
        }

        setEnviando(true);
        setErro("");
        try {
            const novaUrl = await enviarImagemAvatar(arquivo);
            const res = await fetch(`/api/usuarios/${encodeURIComponent(nick)}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nome, nick, email, image: novaUrl, banner, bannerPosicao }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                const msg = (data as { erro?: string }).erro || "Não foi possível atualizar a foto.";
                if (res.status === 403 && arquivoEhGif(arquivo)) {
                    setCtaGifAberto(true);
                    return;
                }
                setErro(msg);
                return;
            }
            const imagemFinal = mediaUrl(novaUrl) || undefined;
            await update({ image: imagemFinal });
            onAtualizado(novaUrl);
        } catch (uploadErro) {
            setErro(uploadErro instanceof Error ? uploadErro.message : "Erro ao enviar imagem.");
        } finally {
            setEnviando(false);
        }
    }

    function renderAvatar() {
        if (exibirAnimado && src) {
            return (
                <Image
                    src={src}
                    alt={nome}
                    width={96}
                    height={96}
                    unoptimized={avatarEhGif}
                    className="h-24 w-24 rounded-full border-4 border-white object-cover"
                />
            );
        }

        if (bloquearAnimacao) {
            if (stillClient) {
                return (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={stillClient}
                        alt={nome}
                        width={96}
                        height={96}
                        className="h-24 w-24 rounded-full border-4 border-white object-cover"
                    />
                );
            }
            return (
                <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-gray-200 font-gabarito-bold text-3xl text-azul-900">
                    {inicial}
                </div>
            );
        }

        if (src && !avatarEhGif) {
            return (
                <Image
                    src={src}
                    alt={nome}
                    width={96}
                    height={96}
                    className="h-24 w-24 rounded-full border-4 border-white object-cover"
                />
            );
        }

        return (
            <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-gray-200 font-gabarito-bold text-3xl text-azul-900">
                {inicial}
            </div>
        );
    }

    return (
        <div className="flex flex-col items-start gap-1">
            <label
                htmlFor={inputId}
                className="group relative h-24 w-24 shrink-0 cursor-pointer"
                title="Alterar foto de perfil"
            >
                {renderAvatar()}
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 opacity-0 transition-opacity group-hover:opacity-100">
                    {enviando ? (
                        <Loader2 className="h-6 w-6 animate-spin text-white" />
                    ) : (
                        <Camera className="h-6 w-6 text-white" />
                    )}
                </div>
                {!temPro && (
                    <span
                        className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-violet-600 text-white ring-2 ring-white"
                        title="GIF no perfil (OpinioPro)"
                        onClick={(e) => {
                            e.preventDefault();
                            setCtaGifAberto(true);
                        }}
                    >
                        <Lock className="h-3 w-3" />
                    </span>
                )}
                <input
                    ref={inputRef}
                    id={inputId}
                    type="file"
                    accept={temPro ? "image/*" : "image/jpeg,image/png,image/webp"}
                    className="hidden"
                    disabled={enviando}
                    onChange={(e) => {
                        const arquivo = e.target.files?.[0];
                        if (arquivo) void handleArquivo(arquivo);
                        e.target.value = "";
                    }}
                />
            </label>
            {!temPro && (
                <button
                    type="button"
                    onClick={() => setCtaGifAberto(true)}
                    className="font-gabarito-regular text-[10px] text-violet-700 hover:underline"
                >
                    GIF no perfil (Pro)
                </button>
            )}
            {erro && <p className="max-w-28 font-gabarito-regular text-[10px] text-red-600">{erro}</p>}
            <PlanoUpgradeModal open={ctaGifAberto} onClose={() => setCtaGifAberto(false)} recurso="gifAvatar" />
        </div>
    );
}
