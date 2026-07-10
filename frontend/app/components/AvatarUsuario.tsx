"use client";

import {
    ehAvatarGif,
    gerarStillClient,
    limparCachePreviewAvatar,
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
    mostrarIndicadorPro?: boolean;
};

function AvatarInicial({
    inicial,
    size,
    className,
    inicialClassName,
    title,
    mostrarPro,
}: {
    inicial: string;
    size: number;
    className: string;
    inicialClassName: string;
    title?: string;
    mostrarPro?: boolean;
}) {
    return (
        <div
            className={`relative flex shrink-0 items-center justify-center rounded-full bg-gray-200 font-gabarito-bold text-azul-900 ${className}`}
            style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.35)) }}
            title={title}
        >
            <span className={inicialClassName}>{inicial}</span>
            {mostrarPro ? (
                <span className="absolute -bottom-0.5 -right-0.5 rounded-full bg-violet-600 px-1 py-px text-[8px] font-gabarito-bold text-white ring-1 ring-white">
                    Pro
                </span>
            ) : null}
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
    mostrarIndicadorPro = false,
}: AvatarUsuarioProps) {
    const inicial = (nome?.charAt(0) || nick?.charAt(0) || "?").toUpperCase();
    const src = mediaUrl(image);
    const urlGif = image || src;
    const ehGif = ehAvatarGif(urlGif) || ehAvatarGif(src);
    const reducaoMovimentoAtiva = useReducaoMovimentoPreferida();

    const [stillClient, setStillClient] = useState<string | null>(null);

    const gifBloqueadoAcessibilidade = Boolean(src && ehGif && reducaoMovimentoAtiva);
    const gifBloqueadoPlano = Boolean(
        src &&
            ehGif &&
            !gifBloqueadoAcessibilidade &&
            !podeExibirAvatarGif(urlGif, assinaturaId, plano, temPlanoPro),
    );
    const gifBloqueado = gifBloqueadoAcessibilidade || gifBloqueadoPlano;

    useEffect(() => {
        if (!gifBloqueado || !src || !ehGif) {
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
    }, [gifBloqueado, src, ehGif]);

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

    // Regra dura: com reduzir movimento / plano, nunca montar o <Image> do GIF.
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
                mostrarPro={gifBloqueadoPlano && mostrarIndicadorPro}
            />
        );
    }

    return (
        <Image
            src={src}
            alt={nome || nick || "Avatar"}
            width={size}
            height={size}
            unoptimized={ehGif}
            className={`shrink-0 rounded-full object-cover ${className}`}
            style={{ width: size, height: size }}
        />
    );
}
