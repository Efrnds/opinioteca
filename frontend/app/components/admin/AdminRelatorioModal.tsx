"use client";

import Box from "@/app/components/Box";
import type { RelatorioSlug } from "@/lib/admin/relatorios";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";

type AdminRelatorioModalProps = {
    open: boolean;
    slug: RelatorioSlug;
    titulo: string;
    subtitulo: string;
    placeholder: string;
    onClose: () => void;
};

export default function AdminRelatorioModal({
    open,
    slug,
    titulo,
    subtitulo,
    placeholder,
    onClose,
}: AdminRelatorioModalProps) {
    const router = useRouter();
    const [consulta, setConsulta] = useState("");

    function abrirRelatorio() {
        const q = consulta.trim();
        if (!q) return;
        onClose();
        router.push(`/admin/relatorios/${slug}?q=${encodeURIComponent(q)}`);
    }

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 8 }}
                        transition={{ duration: 0.2 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Box className="w-full max-w-lg p-6 shadow-xl">
                            <h2 className="font-gabarito-bold text-xl text-azul-900">{titulo}</h2>
                            <p className="mt-2 font-gabarito-regular text-sm text-cinza-700">{subtitulo}</p>

                            <input
                                type="text"
                                value={consulta}
                                onChange={(e) => setConsulta(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && abrirRelatorio()}
                                placeholder={placeholder}
                                className="mt-4 w-full rounded-xl border border-cinza-200 bg-white px-4 py-3 font-gabarito-regular text-sm text-azul-900 outline-none focus:border-azul-600"
                                autoFocus
                            />

                            <button
                                type="button"
                                onClick={abrirRelatorio}
                                disabled={!consulta.trim()}
                                className="mt-4 w-full rounded-full bg-azul-600 px-6 py-3 font-gabarito-bold text-sm text-white transition hover:bg-azul-500 disabled:opacity-50"
                            >
                                Abrir Relatório
                            </button>
                        </Box>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
