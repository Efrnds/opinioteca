"use client";

import { ehAvatarGif, podeExibirAvatarGif } from "@/lib/avatar";
import { mediaUrl } from "@/lib/media";
import type { PlanoStatus } from "@/types/plano";
import Image from "next/image";

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
    const gifBloqueado = Boolean(src && ehGif && !podeExibirAvatarGif(urlGif, assinaturaId, plano, temPlanoPro));

    if (!src || gifBloqueado) {
        return (
            <div
                className={`relative flex shrink-0 items-center justify-center rounded-full bg-gray-200 font-gabarito-bold text-azul-900 ${className}`}
                style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.35)) }}
                title={gifBloqueado ? "GIF de perfil disponível no OpinioPro" : undefined}
            >
                <span className={inicialClassName}>{inicial}</span>
                {gifBloqueado && mostrarIndicadorPro ? (
                    <span className="absolute -bottom-0.5 -right-0.5 rounded-full bg-violet-600 px-1 py-px text-[8px] font-gabarito-bold text-white ring-1 ring-white">
                        Pro
                    </span>
                ) : null}
            </div>
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
