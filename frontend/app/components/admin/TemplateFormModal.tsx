"use client";

import Box from "@/app/components/Box";
import type { TemplateAdmin, TemplateAdminPayload } from "@/types/template";
import type { PlanoCatalogo } from "@/types/plano";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

type TemplateFormModalProps = {
    open: boolean;
    template?: TemplateAdmin | null;
    onClose: () => void;
    onSalvo: () => void;
};

export default function TemplateFormModal({ open, template, onClose, onSalvo }: TemplateFormModalProps) {
    const editando = !!template;
    const [nome, setNome] = useState("");
    const [descricao, setDescricao] = useState("");
    const [texto, setTexto] = useState("");
    const [assinaturaMinimaId, setAssinaturaMinimaId] = useState(2);
    const [ordem, setOrdem] = useState(0);
    const [ativo, setAtivo] = useState(true);
    const [planos, setPlanos] = useState<PlanoCatalogo[]>([]);
    const [salvando, setSalvando] = useState(false);
    const [erro, setErro] = useState("");

    useEffect(() => {
        if (!open) return;
        fetch("/api/planos")
            .then((res) => (res.ok ? res.json() : []))
            .then((data) => {
                if (Array.isArray(data)) {
                    setPlanos(data.filter((p: PlanoCatalogo) => p.codigo !== "gratuito"));
                }
            })
            .catch(() => {});
    }, [open]);

    useEffect(() => {
        if (open) {
            setNome(template?.nome ?? "");
            setDescricao(template?.estrutura_json?.descricao ?? "");
            setTexto(template?.estrutura_json?.texto ?? "");
            setAssinaturaMinimaId(template?.assinatura_minima_id ?? 2);
            setOrdem(template?.ordem ?? 0);
            setAtivo(template?.ativo ?? true);
            setErro("");
        }
    }, [open, template]);

    async function salvar() {
        setSalvando(true);
        setErro("");

        const payload: TemplateAdminPayload = {
            nome,
            descricao,
            texto,
            assinatura_minima_id: assinaturaMinimaId,
            ordem,
            ativo,
        };

        try {
            const res = await fetch(
                editando ? `/api/admin/templates/${template!.id}` : "/api/admin/templates",
                {
                    method: editando ? "PUT" : "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                },
            );
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.erro ?? "Erro ao salvar template");
            }
            onSalvo();
            onClose();
        } catch (e) {
            setErro(e instanceof Error ? e.message : "Erro ao salvar");
        } finally {
            setSalvando(false);
        }
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
                        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto"
                    >
                        <Box className="p-6 shadow-xl">
                            <h2 className="font-gabarito-bold text-xl text-azul-900">
                                {editando ? "Editar Template" : "Novo Template"}
                            </h2>
                            <p className="mt-1 font-gabarito-regular text-sm text-cinza-600">
                                Modelos aparecem na criação de avaliações para assinantes do plano mínimo
                                configurado.
                            </p>

                            <div className="mt-4 flex flex-col gap-3">
                                <label className="flex flex-col gap-1">
                                    <span className="font-gabarito-medium text-sm text-azul-900">Nome</span>
                                    <input
                                        value={nome}
                                        onChange={(e) => setNome(e.target.value)}
                                        placeholder="Ex.: Emoção pura"
                                        className="rounded-xl border border-cinza-200 px-4 py-2.5 font-gabarito-regular text-sm outline-none focus:border-azul-600"
                                    />
                                </label>

                                <label className="flex flex-col gap-1">
                                    <span className="font-gabarito-medium text-sm text-azul-900">
                                        Subtítulo / descrição
                                    </span>
                                    <input
                                        value={descricao}
                                        onChange={(e) => setDescricao(e.target.value)}
                                        placeholder="Breve explicação exibida na seleção"
                                        className="rounded-xl border border-cinza-200 px-4 py-2.5 font-gabarito-regular text-sm outline-none focus:border-azul-600"
                                    />
                                </label>

                                <label className="flex flex-col gap-1">
                                    <span className="font-gabarito-medium text-sm text-azul-900">
                                        Corpo do template
                                    </span>
                                    <textarea
                                        value={texto}
                                        onChange={(e) => setTexto(e.target.value)}
                                        rows={12}
                                        placeholder="Texto que preenche a avaliação ao selecionar o modelo…"
                                        className="resize-y rounded-xl border border-cinza-200 px-4 py-3 font-gabarito-regular text-sm leading-relaxed outline-none focus:border-azul-600"
                                    />
                                </label>

                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <label className="flex flex-col gap-1">
                                        <span className="font-gabarito-medium text-sm text-azul-900">
                                            Plano mínimo
                                        </span>
                                        <select
                                            value={assinaturaMinimaId}
                                            onChange={(e) =>
                                                setAssinaturaMinimaId(Number(e.target.value))
                                            }
                                            className="rounded-xl border border-cinza-200 px-4 py-2.5 font-gabarito-regular text-sm outline-none focus:border-azul-600"
                                        >
                                            {planos.map((plano) => (
                                                <option key={plano.id} value={plano.id}>
                                                    {plano.nome}
                                                </option>
                                            ))}
                                            {planos.length === 0 && (
                                                <>
                                                    <option value={2}>OpinioTop</option>
                                                    <option value={3}>OpinioPro</option>
                                                </>
                                            )}
                                        </select>
                                    </label>

                                    <label className="flex flex-col gap-1">
                                        <span className="font-gabarito-medium text-sm text-azul-900">Ordem</span>
                                        <input
                                            type="number"
                                            min={0}
                                            value={ordem}
                                            onChange={(e) => setOrdem(Number(e.target.value))}
                                            className="rounded-xl border border-cinza-200 px-4 py-2.5 font-gabarito-regular text-sm outline-none focus:border-azul-600"
                                        />
                                    </label>
                                </div>

                                {editando && (
                                    <label className="flex items-center gap-2 font-gabarito-regular text-sm text-azul-900">
                                        <input
                                            type="checkbox"
                                            checked={ativo}
                                            onChange={(e) => setAtivo(e.target.checked)}
                                        />
                                        Ativo
                                    </label>
                                )}
                            </div>

                            {erro && <p className="mt-3 text-sm text-red-500">{erro}</p>}

                            <div className="mt-6 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="rounded-full px-5 py-2 font-gabarito-medium text-sm text-cinza-700 hover:bg-background"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={salvar}
                                    disabled={salvando || !nome.trim() || !texto.trim()}
                                    className="flex items-center gap-2 rounded-full bg-azul-600 px-5 py-2 font-gabarito-bold text-sm text-white hover:bg-azul-500 disabled:opacity-50"
                                >
                                    {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
                                    Salvar
                                </button>
                            </div>
                        </Box>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
