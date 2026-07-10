"use client";

import type { EstanteItem } from "@/types/estante";
import { ROTULOS_STATUS_ESTANTE } from "@/types/estante";
import type { TemaAparencia } from "@/types/configuracao";
import { coresTextoSobreFundo, resolverTomDestaque50 } from "@/lib/tema";
import { cn } from "@/lib/utils";
import { motion, useMotionValue, animate, type PanInfo } from "framer-motion";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useConfiguracoes } from "./ConfiguracoesProvider";

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
/** Qualquer deslocamento acima disso conta como arraste (não clique). */
const DRAG_THRESHOLD_PX = 6;
/** Mantém o bloqueio de clique após o drag acabar (ciclo de click/pointerup). */
const SUPPRESS_CLICK_MS = 120;

export default function EstanteCarousel({
    livros,
    onSelecionar,
    apenasAtivos = true,
    dica = "Arraste ou toque em um livro para registrar a leitura de hoje",
}: EstanteCarouselProps) {
    const { config } = useConfiguracoes();
    const containerRef = useRef<HTMLDivElement>(null);
    const [indiceAtivo, setIndiceAtivo] = useState(0);
    const [arrastando, setArrastando] = useState(false);
    const x = useMotionValue(0);
    /** Fica true do primeiro movimento até depois do ciclo de click. */
    const bloquearCliqueRef = useRef(false);
    const limparBloqueioTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const coresEmpty = coresTextoSobreFundo(
        resolverTomDestaque50({
            tema: (config.tema ?? "claro") as TemaAparencia,
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

    const snapTo = useCallback(
        (index: number) => {
            const clamped = Math.max(0, Math.min(index, lista.length - 1));
            setIndiceAtivo(clamped);
            const target = -clamped * (CARD_WIDTH + CARD_GAP);
            animate(x, target, { type: "spring", stiffness: 320, damping: 32 });
        },
        [lista.length, x],
    );

    useEffect(() => {
        if (indiceAtivo >= lista.length) {
            snapTo(Math.max(0, lista.length - 1));
        }
    }, [lista.length, indiceAtivo, snapTo]);

    useEffect(() => {
        return () => {
            if (limparBloqueioTimerRef.current) {
                clearTimeout(limparBloqueioTimerRef.current);
            }
        };
    }, []);

    function agendarLiberacaoClique() {
        if (limparBloqueioTimerRef.current) {
            clearTimeout(limparBloqueioTimerRef.current);
        }
        limparBloqueioTimerRef.current = setTimeout(() => {
            bloquearCliqueRef.current = false;
            limparBloqueioTimerRef.current = null;
        }, SUPPRESS_CLICK_MS);
    }

    function marcarArraste(info: PanInfo) {
        if (
            Math.abs(info.offset.x) > DRAG_THRESHOLD_PX ||
            Math.abs(info.offset.y) > DRAG_THRESHOLD_PX ||
            Math.abs(info.velocity.x) > 200
        ) {
            bloquearCliqueRef.current = true;
            setArrastando(true);
        }
    }

    function handleDragStart() {
        if (limparBloqueioTimerRef.current) {
            clearTimeout(limparBloqueioTimerRef.current);
            limparBloqueioTimerRef.current = null;
        }
        bloquearCliqueRef.current = false;
        setArrastando(false);
    }

    function handleDrag(_: unknown, info: PanInfo) {
        marcarArraste(info);
    }

    function handleDragEnd(_: unknown, info: PanInfo) {
        marcarArraste(info);

        const offset = info.offset.x;
        const velocity = info.velocity.x;
        let next = indiceAtivo;

        if (offset < -40 || velocity < -300) {
            next = indiceAtivo + 1;
        } else if (offset > 40 || velocity > 300) {
            next = indiceAtivo - 1;
        }

        snapTo(next);
        setArrastando(false);

        // Mantém o bloqueio até depois do click sintético pós-drag.
        if (bloquearCliqueRef.current) {
            agendarLiberacaoClique();
        }
    }

    function handleSelecionar(item: EstanteItem) {
        if (bloquearCliqueRef.current || arrastando) {
            return;
        }
        onSelecionar(item);
    }

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
            <div ref={containerRef} className="relative overflow-hidden px-1">
                <motion.div
                    className="flex cursor-grab touch-pan-y active:cursor-grabbing"
                    style={{ x, gap: CARD_GAP }}
                    drag="x"
                    dragConstraints={{
                        left: -((lista.length - 1) * (CARD_WIDTH + CARD_GAP)),
                        right: 0,
                    }}
                    dragElastic={0.12}
                    onDragStart={handleDragStart}
                    onDrag={handleDrag}
                    onDragEnd={handleDragEnd}
                >
                    {lista.map((item) => (
                        <button
                            key={item.livro.id}
                            type="button"
                            onClick={() => handleSelecionar(item)}
                            className={cn(
                                "group flex w-[140px] shrink-0 flex-col gap-2 rounded-2xl bg-background p-2 text-left transition hover:shadow-md",
                                arrastando && "pointer-events-none",
                            )}
                        >
                            <div className={cn("relative", arrastando && "pointer-events-none")}>
                                {item.livro.capa_url ? (
                                    <Image
                                        src={item.livro.capa_url}
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
                    ))}
                </motion.div>
            </div>

            {lista.length > 1 && (
                <div className="flex items-center justify-center gap-1.5">
                    {lista.map((item, index) => (
                        <button
                            key={item.livro.id}
                            type="button"
                            aria-label={`Ir para ${item.livro.titulo}`}
                            onClick={() => snapTo(index)}
                            className={cn(
                                "h-1.5 rounded-full transition-all",
                                index === indiceAtivo ? "w-5 bg-azul-600" : "w-1.5 bg-azul-200 hover:bg-azul-400",
                            )}
                        />
                    ))}
                </div>
            )}

            {dica ? (
                <p className="text-center font-gabarito-regular text-xs text-cinza-700">{dica}</p>
            ) : null}
        </div>
    );
}
