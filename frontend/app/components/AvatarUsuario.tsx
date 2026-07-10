"use client";

import {
    avatarGifPreviewUrl,
    ehAvatarAnimadoParaAcessibilidade,
    ehAvatarAnimadoPro,
    ehAvatarGif,
    gerarStillClient,
    podeExibirAvatarGif,
} from "@/lib/avatar";
import { mediaUrl } from "@/lib/media";
import type { PlanoStatus } from "@/types/plano";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useReducaoMovimentoPreferida } from "./AcessibilidadeProvider";

type AvatarUsuarioProps = {
    image?: string | null;
    nome?: string;
    nick?: string;
    assinaturaId?: number;
    plano?: PlanoStatus;
    temPlanoPro?: boolean;
    size?: number;
    className?: string;
    inicialClassName?: string;
};

function AvatarInicial({
    inicial,
    size,
    className,
    inicialClassName,
    title,
}: {
    inicial: string;
    size: number;
    className: string;
    inicialClassName: string;
    title?: string;
}) {
    return (
        <div
            className={`relative flex shrink-0 items-center justify-center rounded-full bg-gray-200 font-gabarito-bold text-azul-900 ${className}`}
            style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.35)) }}
            title={title}
        >
            <span className={inicialClassName}>{inicial}</span>
        </div>
    );
}

export default function AvatarUsuario({
    image,
    nome,
    nick,
    assinaturaId,
    plano,
    temPlanoPro,
    size = 44,
    className = "",
    inicialClassName = "",
}: AvatarUsuarioProps) {
    const inicial = (nome?.charAt(0) || nick?.charAt(0) || "?").toUpperCase();
    const src = mediaUrl(image);
    const urlOrigem = image || src;
    const ehGif = ehAvatarGif(urlOrigem) || ehAvatarGif(src);
    const ehAnimadoPro = ehAvatarAnimadoPro(urlOrigem) || ehAvatarAnimadoPro(src);
    const ehAnimadoA11y =
        ehAvatarAnimadoParaAcessibilidade(urlOrigem) || ehAvatarAnimadoParaAcessibilidade(src);
    const previewSrc = mediaUrl(avatarGifPreviewUrl(urlOrigem) ?? avatarGifPreviewUrl(src));
    const reducaoMovimentoAtiva = useReducaoMovimentoPreferida();

    const [stillClient, setStillClient] = useState<string | null>(null);
    const [previewServidorFalhou, setPreviewServidorFalhou] = useState(false);

    const gifBloqueadoAcessibilidade = Boolean(src && ehAnimadoA11y && reducaoMovimentoAtiva);
    const gifBloqueadoPlano = Boolean(
        src &&
            ehAnimadoPro &&
            !gifBloqueadoAcessibilidade &&
            !podeExibirAvatarGif(urlOrigem, assinaturaId, plano, temPlanoPro),
    );
    const gifBloqueado = gifBloqueadoAcessibilidade || gifBloqueadoPlano;

    useEffect(() => {
        if (!gifBloqueado || !src) {
            setStillClient(null);
            setPreviewServidorFalhou(false);
            return;
        }

        let cancelado = false;
        void gerarStillClient(src).then((dataUrl) => {
            if (!cancelado && dataUrl) setStillClient(dataUrl);
        });

        return () => {
            cancelado = true;
        };
    }, [gifBloqueado, src]);

    if (!src) {
        return (
            <AvatarInicial
                inicial={inicial}
                size={size}
                className={className}
                inicialClassName={inicialClassName}
            />
        );
    }

    if (gifBloqueado) {
        if (stillClient) {
            return (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={stillClient}
                    alt={nome || nick || "Avatar"}
                    width={size}
                    height={size}
                    className={`shrink-0 rounded-full object-cover ${className}`}
                    style={{ width: size, height: size }}
                />
            );
        }

        if (previewSrc && !previewServidorFalhou) {
            return (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={previewSrc}
                    alt={nome || nick || "Avatar"}
                    width={size}
                    height={size}
                    onError={() => setPreviewServidorFalhou(true)}
                    className={`shrink-0 rounded-full object-cover ${className}`}
                    style={{ width: size, height: size }}
                />
            );
        }

        return (
            <AvatarInicial
                inicial={inicial}
                size={size}
                className={className}
                inicialClassName={inicialClassName}
                title={
                    gifBloqueadoPlano
                        ? "GIF de perfil disponível no OpinioPro"
                        : "GIF desativado por reduzir movimento"
                }
            />
        );
    }

    return (
        <Image
            src={src}
            alt={nome || nick || "Avatar"}
            width={size}
            height={size}
            unoptimized={ehGif || ehAnimadoPro || ehAnimadoA11y}
            className={`shrink-0 rounded-full object-cover ${className}`}
            style={{ width: size, height: size }}
        />
    );
}
