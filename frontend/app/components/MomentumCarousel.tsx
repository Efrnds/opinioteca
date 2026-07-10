"use client";

import { cn } from "@/lib/utils";
import { motion, useMotionValue, type PanInfo } from "framer-motion";
import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    type ReactNode,
} from "react";

/** Qualquer deslocamento acima disso conta como arraste (não clique). */
const DRAG_THRESHOLD_PX = 6;
/** Mantém o bloqueio de clique após o drag acabar (ciclo de click/pointerup). */
const SUPPRESS_CLICK_MS = 120;

export type MomentumCarouselApi = {
    arrastando: boolean;
    /** Envolve o handler de clique para ignorar cliques após arraste. */
    protegerClique: (handler: () => void) => () => void;
    /** Use em onClick de Links: impede navegação se houve arraste. */
    impedirCliqueSeArrastou: (e: { preventDefault: () => void }) => void;
};

type MomentumCarouselProps = {
    itemCount: number;
    itemWidth: number;
    gap?: number;
    className?: string;
    trackClassName?: string;
    children: (api: MomentumCarouselApi) => ReactNode;
};

export default function MomentumCarousel({
    itemCount,
    itemWidth,
    gap = 16,
    className,
    trackClassName,
    children,
}: MomentumCarouselProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [arrastando, setArrastando] = useState(false);
    const [dragConstraints, setDragConstraints] = useState({ left: 0, right: 0 });
    const x = useMotionValue(0);
    const bloquearCliqueRef = useRef(false);
    const limparBloqueioTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const atualizarConstraints = useCallback(() => {
        const container = containerRef.current;
        if (!container || itemCount === 0) {
            setDragConstraints({ left: 0, right: 0 });
            return;
        }
        const totalWidth = itemCount * itemWidth + (itemCount - 1) * gap;
        const overflow = Math.max(0, totalWidth - container.clientWidth);
        setDragConstraints({ left: -overflow, right: 0 });

        const atual = x.get();
        if (atual < -overflow) {
            x.set(-overflow);
        } else if (atual > 0) {
            x.set(0);
        }
    }, [gap, itemCount, itemWidth, x]);

    useLayoutEffect(() => {
        atualizarConstraints();
    }, [atualizarConstraints]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const observer = new ResizeObserver(() => atualizarConstraints());
        observer.observe(container);
        return () => observer.disconnect();
    }, [atualizarConstraints]);

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
        setArrastando(false);

        if (bloquearCliqueRef.current) {
            agendarLiberacaoClique();
        }
    }

    const api: MomentumCarouselApi = {
        arrastando,
        protegerClique(handler) {
            return () => {
                if (bloquearCliqueRef.current || arrastando) return;
                handler();
            };
        },
        impedirCliqueSeArrastou(e) {
            if (bloquearCliqueRef.current || arrastando) {
                e.preventDefault();
            }
        },
    };

    return (
        <div ref={containerRef} className={cn("relative overflow-hidden", className)}>
            <motion.div
                className={cn(
                    "flex cursor-grab touch-pan-y active:cursor-grabbing",
                    trackClassName,
                )}
                style={{ x, gap }}
                drag="x"
                dragConstraints={dragConstraints}
                dragElastic={0.08}
                dragMomentum
                dragTransition={{
                    power: 0.55,
                    timeConstant: 280,
                    bounceStiffness: 280,
                    bounceDamping: 36,
                }}
                onDragStart={handleDragStart}
                onDrag={handleDrag}
                onDragEnd={handleDragEnd}
            >
                {children(api)}
            </motion.div>
        </div>
    );
}
