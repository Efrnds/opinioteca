"use client";
import { RELATORIOS, type RelatorioSlug } from "@/lib/admin/relatorios";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

type RelatorioConsultaModalProps = {
    slug: RelatorioSlug | null;
    open: boolean;
    onClose: () => void;
};

export default function RelatorioConsultaModal({ slug, open, onClose }: RelatorioConsultaModalProps) {
    const router = useRouter();
    const config = slug ? RELATORIOS[slug] : null;
    const [consulta, setConsulta] = useState("");
    const [erro, setErro] = useState("");

    useEffect(() => {
        if (open) {
            setConsulta("");
            setErro("");
        }
    }, [open, slug]);

    function abrir(e: FormEvent) {
        e.preventDefault();
        if (!slug || !config) return;
        const q = consulta.trim();
        if (!q) {
            setErro("Informe a consulta para abrir o relatório.");
            return;
        }
        onClose();
        router.push(`/admin/relatorios/${slug}?q=${encodeURIComponent(q)}`);
    }

    return (
        <AnimatePresence>
            {open && config && (
                <motion.div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                >
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="relatorio-modal-titulo"
                        className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-2xl"
                        initial={{ opacity: 0, scale: 0.94, y: 16 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 8 }}
                        transition={{ type: "spring", stiffness: 420, damping: 32 }}
                        onClick={(ev) => ev.stopPropagation()}
                    >
                        <h2 id="relatorio-modal-titulo" className="font-gabarito-bold text-2xl text-azul-900">
                            {config.titulo}
                        </h2>
                        <p className="mt-3 font-gabarito-regular text-sm text-cinza-700">
                            {config.subtitulo}
                        </p>

                        <form onSubmit={abrir} className="mt-6 flex flex-col gap-4">
                            <input
                                autoFocus
                                type="text"
                                value={consulta}
                                onChange={(e) => {
                                    setConsulta(e.target.value);
                                    if (erro) setErro("");
                                }}
                                placeholder={config.placeholder}
                                className="w-full rounded-xl border border-cinza-200 bg-white px-4 py-3 font-gabarito-regular text-sm text-azul-900 outline-none placeholder:text-cinza-400 focus:border-azul-600"
                            />
                            {erro && (
                                <p className="font-gabarito-regular text-sm text-red-600">{erro}</p>
                            )}
                            <button
                                type="submit"
                                className="w-full rounded-xl bg-azul-600 px-4 py-3.5 font-gabarito-bold text-sm text-white transition hover:bg-azul-500"
                            >
                                Abrir Relatório
                            </button>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
