"use client";

import { validarArquivoImagem } from "@/lib/upload";
import { Pencil } from "lucide-react";
import Image from "next/image";
import { ChangeEvent, useId } from "react";

type AvatarPickerProps = {
    previewUrl?: string | null;
    fallbackInicial?: string;
    onSelecionar: (arquivo: File) => void;
    onErro?: (mensagem: string) => void;
    tamanho?: "sm" | "md";
};

export default function AvatarPicker({
    previewUrl,
    fallbackInicial = "?",
    onSelecionar,
    onErro,
    tamanho = "md",
}: AvatarPickerProps) {
    const inputId = useId();
    const dimensao = tamanho === "sm" ? "h-14 w-14" : "h-20 w-20";
    const px = tamanho === "sm" ? 56 : 80;

    function handleChange(e: ChangeEvent<HTMLInputElement>) {
        const arquivo = e.target.files?.[0];
        if (!arquivo) return;

        const erroValidacao = validarArquivoImagem(arquivo);
        if (erroValidacao) {
            onErro?.(erroValidacao);
            e.target.value = "";
            return;
        }

        onSelecionar(arquivo);
        e.target.value = "";
    }

    return (
        <div className="flex items-center gap-4">
            <label htmlFor={inputId} className={`group relative ${dimensao} shrink-0 cursor-pointer`}>
                {previewUrl ? (
                    <Image
                        src={previewUrl}
                        alt="Foto de perfil"
                        width={px}
                        height={px}
                        className={`${dimensao} rounded-full object-cover`}
                        unoptimized
                    />
                ) : (
                    <div
                        className={`flex ${dimensao} items-center justify-center rounded-full bg-gray-200 font-gabarito-bold text-azul-900`}
                    >
                        {fallbackInicial.charAt(0).toUpperCase()}
                    </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                    <Pencil className="h-5 w-5 text-white" />
                </div>
                <input
                    id={inputId}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleChange}
                />
            </label>
            <p className="font-gabarito-regular text-sm text-cinza-700">Clique na foto para alterar</p>
        </div>
    );
}
