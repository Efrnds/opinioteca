"use client";

import type { EstanteItem } from "@/types/estante";
import { ROTULOS_STATUS_ESTANTE } from "@/types/estante";
import type { TemaAparencia } from "@/types/configuracao";
import { coresTextoSobreFundo, resolverTomDestaque50 } from "@/lib/tema";
import { mediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useConfiguracoes } from "./ConfiguracoesProvider";
import MomentumCarousel from "./MomentumCarousel";

type EstanteCarouselProps = {
    livros: EstanteItem[];
    onSelecionar: (item: EstanteItem) => void;
    /** Livros em leitura ativa (exclui concluídos) */
    apenasAtivos?: boolean;
    /** Texto de ajuda abaixo do carrossel */
    dica?: string;
};

const CARD_WIDTH = 140;
const CARD_GAP = 16;

export default function EstanteCarousel({
    livros,
    onSelecionar,
    apenasAtivos = true,
    dica = "Arraste ou toque em um livro para registrar a leitura de hoje",
}: EstanteCarouselProps) {
    const { config } = useConfiguracoes();

    const coresEmpty = coresTextoSobreFundo(
        resolverTomDestaque50({
            tema: (config.tema ?? "claro") as TemaAparencia,
            daltonismoTipo: config.daltonismoTipo ?? "deuteranopia",
            corDestaque: config.corDestaque ?? "azul",
            corFundoTexto: config.corFundoTexto ?? null,
            corSuperficie: config.corSuperficie ?? null,
            corTexto: config.corTexto ?? null,
            corHover: config.corHover ?? null,
        }),
    );

    const lista = apenasAtivos
        ? livros.filter((item) => item.status !== "lido" && item.porcentagem_atual < 100)
        : livros;

    if (lista.length === 0) {
        return (
            <div className="rounded-2xl border border-dashed border-cinza-200 bg-azul-50 px-4 py-8 text-center">
                <p className="font-gabarito-bold text-sm" style={{ color: coresEmpty.titulo }}>
                    Sua estante está vazia
                </p>
                <p className="mt-1 font-gabarito-regular text-xs" style={{ color: coresEmpty.subtitulo }}>
                    Adicione livros na aba Livros do seu perfil para registrar leituras aqui.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3">
            <MomentumCarousel
                itemCount={lista.length}
                itemWidth={CARD_WIDTH}
                gap={CARD_GAP}
                className="px-1"
            >
                {({ arrastando, protegerClique }) =>
                    lista.map((item) => (
                        <button
                            key={item.livro.id}
                            type="button"
                            onClick={protegerClique(() => onSelecionar(item))}
                            className={cn(
                                "group flex w-[140px] shrink-0 flex-col gap-2 rounded-2xl bg-background p-2 text-left transition hover:shadow-md",
                                arrastando && "pointer-events-none",
                            )}
                        >
                            <div className={cn("relative", arrastando && "pointer-events-none")}>
                                {mediaUrl(item.livro.capa_url) ? (
                                    <Image
                                        src={mediaUrl(item.livro.capa_url)!}
                                        alt={item.livro.titulo}
                                        width={CARD_WIDTH}
                                        height={210}
                                        className="pointer-events-none h-[210px] w-full rounded-xl object-cover shadow-sm transition group-hover:scale-[1.02]"
                                        unoptimized
                                        draggable={false}
                                    />
                                ) : (
                                    <div className="pointer-events-none flex h-[210px] w-full items-center justify-center rounded-xl bg-azul-200 text-4xl">
                                        📖
                                    </div>
                                )}
                                {item.porcentagem_atual > 0 && (
                                    <span className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-azul-600 px-2 py-0.5 font-gabarito-bold text-[10px] text-white shadow">
                                        {Math.round(item.porcentagem_atual)}%
                                    </span>
                                )}
                            </div>
                            <p className="pointer-events-none line-clamp-2 font-gabarito-bold text-xs text-azul-900">
                                {item.livro.titulo}
                            </p>
                            <p className="pointer-events-none line-clamp-1 font-gabarito-regular text-[10px] text-cinza-700">
                                {item.livro.autor}
                            </p>
                            <span
                                className={cn(
                                    "pointer-events-none rounded-full px-2 py-0.5 text-center font-gabarito-bold text-[10px]",
                                    item.status === "lendo"
                                        ? "bg-amber-100 text-amber-700"
                                        : "bg-gray-200 text-cinza-700",
                                )}
                            >
                                {ROTULOS_STATUS_ESTANTE[item.status]}
                            </span>
                        </button>
                    ))
                }
            </MomentumCarousel>

            {dica ? (
                <p className="text-center font-gabarito-regular text-xs text-cinza-700">{dica}</p>
            ) : null}
        </div>
    );
}
