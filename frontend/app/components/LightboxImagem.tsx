"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

type LightboxImagemProps = {
    open: boolean;
    onClose: () => void;
    src: string;
    alt: string;
};

export default function LightboxImagem({ open, onClose, src, alt }: LightboxImagemProps) {
    const [montado, setMontado] = useState(false);

    useEffect(() => {
        setMontado(true);
    }, []);

    const aoTeclar = useCallback(
        (evento: KeyboardEvent) => {
            if (evento.key === "Escape") {
                onClose();
            }
        },
        [onClose],
    );

    useEffect(() => {
        if (!open) {
            return;
        }

        document.addEventListener("keydown", aoTeclar);
        const overflowAnterior = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            document.removeEventListener("keydown", aoTeclar);
            document.body.style.overflow = overflowAnterior;
        };
    }, [open, aoTeclar]);

    if (!montado) {
        return null;
    }

    return createPortal(
        <AnimatePresence>
            {open && (
                <motion.div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    role="dialog"
                    aria-modal="true"
                    aria-label={alt}
                >
                    <motion.button
                        type="button"
                        className="absolute inset-0 bg-black/60 supports-backdrop-filter:backdrop-blur-sm"
                        onClick={onClose}
                        aria-label="Fechar visualização"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    />

                    <button
                        type="button"
                        onClick={onClose}
                        className="absolute top-4 right-4 z-10 rounded-full bg-black/50 p-2 text-white transition hover:bg-black/70"
                        aria-label="Fechar"
                    >
                        <X className="h-6 w-6" />
                    </button>

                    <motion.div
                        className="relative z-10 h-[min(90vh,900px)] w-[min(90vw,600px)]"
                        initial={{ opacity: 0, scale: 0.88 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.94 }}
                        transition={{
                            type: "spring",
                            stiffness: 420,
                            damping: 32,
                            mass: 0.8,
                        }}
                        onClick={(evento) => evento.stopPropagation()}
                    >
                        <Image
                            src={src}
                            alt={alt}
                            fill
                            className="rounded-lg object-contain"
                            unoptimized
                            sizes="90vw"
                            priority
                        />
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body,
    );
}
