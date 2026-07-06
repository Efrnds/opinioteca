"use client";

import Box from "@/app/components/Box";
import type { CategoriaAdmin } from "@/types/admin";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

type CategoriaFormModalProps = {
    open: boolean;
    categoria?: CategoriaAdmin | null;
    onClose: () => void;
    onSalvo: () => void;
};

export default function CategoriaFormModal({ open, categoria, onClose, onSalvo }: CategoriaFormModalProps) {
    const editando = !!categoria;
    const [nome, setNome] = useState("");
    const [ativo, setAtivo] = useState(true);
    const [salvando, setSalvando] = useState(false);
    const [erro, setErro] = useState("");

    useEffect(() => {
        if (open) {
            setNome(categoria?.nome_categoria ?? "");
            setAtivo(categoria?.ativo ?? true);
            setErro("");
        }
    }, [open, categoria]);

    async function salvar() {
        setSalvando(true);
        setErro("");

        try {
            const res = await fetch(
                editando ? `/api/admin/categorias/${categoria!.id}` : "/api/admin/categorias",
                {
                    method: editando ? "PUT" : "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ nome_categoria: nome, ativo }),
                },
            );
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.erro ?? "Erro ao salvar categoria");
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
                    >
                        <Box className="w-full max-w-md p-6 shadow-xl">
                            <h2 className="font-gabarito-bold text-xl text-azul-900">
                                {editando ? "Editar Categoria" : "Nova Categoria"}
                            </h2>

                            <div className="mt-4 flex flex-col gap-3">
                                <input
                                    value={nome}
                                    onChange={(e) => setNome(e.target.value)}
                                    placeholder="Nome da categoria"
                                    className="rounded-xl border border-cinza-200 px-4 py-2.5 font-gabarito-regular text-sm outline-none focus:border-azul-600"
                                />
                                {editando && (
                                    <label className="flex items-center gap-2 font-gabarito-regular text-sm text-azul-900">
                                        <input
                                            type="checkbox"
                                            checked={ativo}
                                            onChange={(e) => setAtivo(e.target.checked)}
                                        />
                                        Ativa
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
                                    disabled={salvando || !nome.trim()}
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
