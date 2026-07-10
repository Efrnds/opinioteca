"use client";

import { mediaUrl } from "@/lib/media";
import { enviarImagemBanner, validarArquivoBanner } from "@/lib/upload";
import { Camera, Loader2 } from "lucide-react";
import Image from "next/image";
import { useId, useRef, useState } from "react";

type BannerPerfilProps = {
    nome: string;
    nick: string;
    email: string;
    image?: string;
    banner?: string;
    editavel?: boolean;
    onAtualizado?: (banner?: string) => void;
};

export default function BannerPerfil({
    nome,
    nick,
    email,
    image,
    banner,
    editavel = false,
    onAtualizado,
}: BannerPerfilProps) {
    const inputId = useId();
    const inputRef = useRef<HTMLInputElement>(null);
    const [enviando, setEnviando] = useState(false);
    const [erro, setErro] = useState("");

    const bannerSrc = mediaUrl(banner);

    async function handleArquivo(arquivo: File) {
        const erroValidacao = validarArquivoBanner(arquivo);
        if (erroValidacao) {
            setErro(erroValidacao);
            return;
        }

        setEnviando(true);
        setErro("");
        try {
            const novaUrl = await enviarImagemBanner(arquivo);
            const res = await fetch(`/api/usuarios/${encodeURIComponent(nick)}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nome, nick, email, image, banner: novaUrl }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                setErro((data as { erro?: string }).erro || "Não foi possível atualizar o banner.");
                return;
            }
            onAtualizado?.(novaUrl);
        } catch (uploadErro) {
            setErro(uploadErro instanceof Error ? uploadErro.message : "Erro ao enviar banner.");
        } finally {
            setEnviando(false);
        }
    }

    const conteudo = (
        <>
            {bannerSrc ? (
                <Image
                    src={bannerSrc}
                    alt={`Banner de ${nome || nick}`}
                    fill
                    priority
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 768px"
                />
            ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-azul-900 via-azul-700 to-azul-600" />
            )}
            {editavel && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 transition-opacity group-hover:opacity-100">
                    {enviando ? (
                        <Loader2 className="h-7 w-7 animate-spin text-white" />
                    ) : (
                        <span className="flex items-center gap-2 rounded-full bg-azul-600 px-3 py-1.5 font-gabarito-bold text-xs text-white shadow-sm">
                            <Camera className="h-4 w-4" />
                            Alterar banner
                        </span>
                    )}
                </div>
            )}
        </>
    );

    return (
        <div className="relative">
            {editavel ? (
                <label
                    htmlFor={inputId}
                    className="group relative block h-32 w-full cursor-pointer overflow-hidden"
                    title="Alterar banner do perfil"
                >
                    {conteudo}
                    <input
                        ref={inputRef}
                        id={inputId}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        disabled={enviando}
                        onChange={(e) => {
                            const arquivo = e.target.files?.[0];
                            if (arquivo) void handleArquivo(arquivo);
                            e.target.value = "";
                        }}
                    />
                </label>
            ) : (
                <div className="relative h-32 w-full overflow-hidden">{conteudo}</div>
            )}
            {erro && (
                <p className="absolute bottom-1 left-2 right-2 z-10 rounded bg-white/90 px-2 py-1 font-gabarito-regular text-[10px] text-red-600">
                    {erro}
                </p>
            )}
        </div>
    );
}
