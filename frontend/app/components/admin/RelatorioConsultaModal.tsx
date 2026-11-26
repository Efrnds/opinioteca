"use client";
import { carregarOpcoesRelatorio } from "@/lib/admin/relatorio-opcoes";
import { RELATORIOS, type RelatorioOpcao, type RelatorioSlug } from "@/lib/admin/relatorios";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

type RelatorioConsultaModalProps = {
    slug: RelatorioSlug | null;
    open: boolean;
    onClose: () => void;
};

const selectClass =
    "w-full rounded-xl border border-cinza-200 bg-white px-4 py-3 font-gabarito-regular text-sm text-azul-900 outline-none focus:border-azul-600 disabled:opacity-60";

export default function RelatorioConsultaModal({ slug, open, onClose }: RelatorioConsultaModalProps) {
    const router = useRouter();
    const config = slug ? RELATORIOS[slug] : null;
    const [consulta, setConsulta] = useState("");
    const [opcoes, setOpcoes] = useState<RelatorioOpcao[]>([]);
    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState("");

    useEffect(() => {
        if (!open || !config) return;
        setConsulta("");
        setErro("");
        setOpcoes([]);
        let cancelado = false;
        setCarregando(true);
        carregarOpcoesRelatorio(config.fonte)
            .then((lista) => {
                if (!cancelado) setOpcoes(lista);
            })
            .catch(() => {
                if (!cancelado) setErro("Não foi possível carregar as opções.");
            })
            .finally(() => {
                if (!cancelado) setCarregando(false);
            });
        return () => {
            cancelado = true;
        };
    }, [open, slug, config]);

    function abrir(e: FormEvent) {
        e.preventDefault();
        if (!slug || !config) return;
        const q = consulta.trim();
        if (!q) {
            setErro("Selecione uma opção para abrir o relatório.");
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
                            {carregando ? (
                                <div className="flex items-center justify-center gap-2 rounded-xl border border-cinza-200 py-8 text-cinza-600">
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    <span className="font-gabarito-regular text-sm">Carregando opções...</span>
                                </div>
                            ) : (
                                <select
                                    autoFocus
                                    value={consulta}
                                    onChange={(e) => {
                                        setConsulta(e.target.value);
                                        if (erro) setErro("");
                                    }}
                                    className={selectClass}
                                >
                                    <option value="">{config.placeholder}</option>
                                    {opcoes.map((o) => (
                                        <option key={`${o.value}-${o.label}`} value={o.value}>
                                            {o.label}
                                        </option>
                                    ))}
                                </select>
                            )}

                            {!carregando && opcoes.length === 0 && !erro && (
                                <p className="font-gabarito-regular text-sm text-amber-700">
                                    Nenhuma opção encontrada no banco.
                                </p>
                            )}

                            {erro && (
                                <p className="font-gabarito-regular text-sm text-red-600">{erro}</p>
                            )}

                            <button
                                type="submit"
                                disabled={carregando || !consulta}
                                className="w-full rounded-xl bg-azul-600 px-4 py-3.5 font-gabarito-bold text-sm text-white transition hover:bg-azul-500 disabled:opacity-60"
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
