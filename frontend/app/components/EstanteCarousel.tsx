"use client";

import type { EstanteItem } from "@/types/estante";
import { ROTULOS_STATUS_ESTANTE } from "@/types/estante";
import type { TemaAparencia } from "@/types/configuracao";
import { coresTextoSobreFundo, resolverTomDestaque50 } from "@/lib/tema";
import { mediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
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
    /** Card final para abrir o cadastro de livro na estante */
    onAdicionarLivro?: () => void;
};

const CARD_WIDTH = 140;
const CARD_GAP = 16;

export default function EstanteCarousel({
    livros,
    onSelecionar,
    apenasAtivos = true,
    dica = "Arraste ou toque em um livro para registrar a leitura de hoje",
    onAdicionarLivro,
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

    const totalItens = lista.length + (onAdicionarLivro ? 1 : 0);

    if (lista.length === 0 && !onAdicionarLivro) {
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
            {lista.length === 0 && onAdicionarLivro ? (
                <p className="text-center font-gabarito-regular text-xs text-cinza-700">
                    Sua estante está vazia. Adicione um livro para continuar.
                </p>
            ) : null}

            <MomentumCarousel
                itemCount={totalItens}
                itemWidth={CARD_WIDTH}
                gap={CARD_GAP}
                className="px-1"
            >
                {({ arrastando, protegerClique }) => (
                    <>
                        {lista.map((item) => (
                            <button
                                key={item.livro.id}
                                type="button"
                                onClick={protegerClique(() => onSelecionar(item))}
                                className={cn(
                                    "group flex w-[140px] min-w-0 shrink-0 flex-col gap-2 rounded-2xl bg-background p-2 text-left transition hover:shadow-md",
                                    arrastando && "pointer-events-none",
                                )}
                            >
                                <div className={cn("relative w-full shrink-0", arrastando && "pointer-events-none")}>
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
                                <p className="pointer-events-none line-clamp-2 h-8 w-full break-words font-gabarito-bold text-xs leading-4 text-azul-900">
                                    {item.livro.titulo}
                                </p>
                                <p className="pointer-events-none h-4 w-full truncate font-gabarito-regular text-[11px] leading-4 text-cinza-700">
                                    {item.livro.autor}
                                </p>
                                <span
                                    className={cn(
                                        "pointer-events-none mt-auto flex min-h-6 w-full items-center justify-center rounded-full px-2 py-1 text-center font-gabarito-bold text-[11px] leading-4",
                                        item.status === "lendo"
                                            ? "bg-amber-100 text-amber-700"
                                            : "bg-gray-200 text-cinza-700",
                                    )}
                                >
                                    {ROTULOS_STATUS_ESTANTE[item.status]}
                                </span>
                            </button>
                        ))}

                        {onAdicionarLivro ? (
                            <button
                                type="button"
                                onClick={protegerClique(onAdicionarLivro)}
                                className={cn(
                                    "group flex w-[140px] min-w-0 shrink-0 flex-col gap-2 rounded-2xl border-2 border-dashed border-azul-300 bg-azul-50/60 p-2 text-left transition hover:border-azul-600 hover:bg-azul-50 hover:shadow-md",
                                    arrastando && "pointer-events-none",
                                )}
                            >
                                <div
                                    className={cn(
                                        "flex h-[210px] w-full items-center justify-center rounded-xl bg-azul-100 transition group-hover:bg-azul-200",
                                        arrastando && "pointer-events-none",
                                    )}
                                >
                                    <Plus className="h-10 w-10 text-azul-600" strokeWidth={2.25} />
                                </div>
                                <p className="pointer-events-none line-clamp-2 h-8 w-full break-words font-gabarito-bold text-xs leading-4 text-azul-900">
                                    Adicionar livro
                                </p>
                                <p className="pointer-events-none h-4 w-full truncate font-gabarito-regular text-[11px] leading-4 text-cinza-700">
                                    Novo na estante
                                </p>
                                <span className="pointer-events-none mt-auto flex min-h-6 w-full items-center justify-center rounded-full bg-azul-100 px-2 py-1 text-center font-gabarito-bold text-[11px] leading-4 text-azul-700">
                                    Cadastrar
                                </span>
                            </button>
                        ) : null}
                    </>
                )}
            </MomentumCarousel>

            {dica ? (
                <p className="text-center font-gabarito-regular text-xs text-cinza-700">{dica}</p>
            ) : null}
        </div>
    );
}
