"use client";

import { cn } from "@/lib/utils";
import { animate, motion, useMotionValue, type PanInfo } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    type WheelEvent,
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
    const trackRef = useRef<HTMLDivElement>(null);
    const [arrastando, setArrastando] = useState(false);
    const [dragConstraints, setDragConstraints] = useState({ left: 0, right: 0 });
    const [overflowPx, setOverflowPx] = useState(0);
    const x = useMotionValue(0);
    const animacaoRef = useRef<ReturnType<typeof animate> | null>(null);
    const bloquearCliqueRef = useRef(false);
    const limparBloqueioTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const atualizarConstraints = useCallback(() => {
        const container = containerRef.current;
        const track = trackRef.current;
        if (!container || !track || itemCount === 0) {
            setDragConstraints({ left: 0, right: 0 });
            setOverflowPx(0);
            return;
        }
        const totalWidth = track.scrollWidth;
        const overflow = Math.max(0, totalWidth - container.clientWidth);
        setOverflowPx(overflow);
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
        const track = trackRef.current;
        if (!container || !track) return;

        const observer = new ResizeObserver(() => atualizarConstraints());
        observer.observe(container);
        observer.observe(track);
        return () => observer.disconnect();
    }, [atualizarConstraints]);

    useEffect(() => {
        return () => {
            if (limparBloqueioTimerRef.current) {
                clearTimeout(limparBloqueioTimerRef.current);
            }
            if (animacaoRef.current) {
                animacaoRef.current.stop();
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

    function moverPorPagina(direcao: -1 | 1) {
        const container = containerRef.current;
        if (!container || overflowPx <= 0) return;
        const passo = Math.max(itemWidth + gap, Math.round(container.clientWidth * 0.82));
        const alvo = x.get() - direcao * passo;
        const minimo = -overflowPx;
        const destino = Math.max(minimo, Math.min(0, alvo));
        if (animacaoRef.current) {
            animacaoRef.current.stop();
        }
        animacaoRef.current = animate(x, destino, {
            type: "spring",
            stiffness: 340,
            damping: 36,
            mass: 0.8,
        });
    }

    function onWheel(e: WheelEvent<HTMLDivElement>) {
        if (overflowPx <= 0) return;
        const predominanteX = Math.abs(e.deltaX) > Math.abs(e.deltaY);
        const delta = predominanteX ? e.deltaX : e.deltaY;
        if (Math.abs(delta) < 1) return;
        e.preventDefault();
        const minimo = -overflowPx;
        const proximo = x.get() - delta * 0.9;
        x.set(Math.max(minimo, Math.min(0, proximo)));
    }

    return (
        <div
            ref={containerRef}
            className={cn("relative overflow-hidden", className)}
            onWheel={onWheel}
        >
            <motion.div
                ref={trackRef}
                className={cn(
                    "flex cursor-grab touch-pan-y select-none active:cursor-grabbing",
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
            {overflowPx > 0 ? (
                <>
                    <button
                        type="button"
                        onClick={() => moverPorPagina(-1)}
                        className="absolute left-1 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-cinza-200 bg-white/90 p-1.5 text-azul-900 shadow-sm transition hover:bg-white md:inline-flex"
                        aria-label="Voltar carrossel"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => moverPorPagina(1)}
                        className="absolute right-1 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-cinza-200 bg-white/90 p-1.5 text-azul-900 shadow-sm transition hover:bg-white md:inline-flex"
                        aria-label="Avançar carrossel"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </>
            ) : null}
        </div>
    );
}
