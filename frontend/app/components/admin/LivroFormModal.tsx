"use client";

import Box from "@/app/components/Box";
import { SelecionarCategoriasLivro } from "@/app/components/FormularioLivroCampos";
import type { CategoriaAdmin, LivroAdmin } from "@/types/admin";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

type LivroFormModalProps = {
    open: boolean;
    livro?: LivroAdmin | null;
    categorias: CategoriaAdmin[];
    onClose: () => void;
    onSalvo: () => void;
};

export default function LivroFormModal({ open, livro, categorias, onClose, onSalvo }: LivroFormModalProps) {
    const editando = !!livro;
    const [titulo, setTitulo] = useState("");
    const [autor, setAutor] = useState("");
    const [editora, setEditora] = useState("");
    const [isbn, setIsbn] = useState("");
    const [paginas, setPaginas] = useState("");
    const [categoriasIds, setCategoriasIds] = useState<number[]>([]);
    const [status, setStatus] = useState("ativo");
    const [sinopse, setSinopse] = useState("");
    const [salvando, setSalvando] = useState(false);
    const [erro, setErro] = useState("");

    useEffect(() => {
        if (open) {
            setTitulo(livro?.titulo ?? "");
            setAutor(livro?.autor ?? "");
            setEditora(livro?.editora ?? "");
            setIsbn(livro?.isbn ?? "");
            setPaginas(livro?.paginas ? String(livro.paginas) : "");
            const idsIniciais =
                livro?.categorias_ids && livro.categorias_ids.length > 0
                    ? livro.categorias_ids
                    : livro?.categoria_id
                      ? [livro.categoria_id]
                      : categorias[0]
                        ? [categorias[0].id]
                        : [];
            setCategoriasIds(idsIniciais);
            setStatus(livro?.status ?? "ativo");
            setSinopse(livro?.sinopse ?? "");
            setErro("");
        }
    }, [open, livro, categorias]);

    async function salvar() {
        setSalvando(true);
        setErro("");

        const payload = {
            titulo,
            autor,
            editora: editora || undefined,
            isbn: isbn || undefined,
            paginas: Number(paginas) || 0,
            categorias_ids: categoriasIds,
            categoria_id: categoriasIds[0],
            status,
            sinopse: sinopse || undefined,
        };

        try {
            const res = await fetch(editando ? `/api/admin/livros/${livro!.id}` : "/api/admin/livros", {
                method: editando ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.erro ?? "Erro ao salvar livro");
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
                        <Box className="max-h-[90vh] w-full max-w-lg overflow-y-auto p-6 shadow-xl">
                            <h2 className="font-gabarito-bold text-xl text-azul-900">
                                {editando ? "Editar Livro" : "Novo Livro"}
                            </h2>

                            <div className="mt-4 flex flex-col gap-3">
                                <input
                                    value={titulo}
                                    onChange={(e) => setTitulo(e.target.value)}
                                    placeholder="Título"
                                    className="rounded-xl border border-cinza-200 px-4 py-2.5 font-gabarito-regular text-sm outline-none focus:border-azul-600"
                                />
                                <input
                                    value={autor}
                                    onChange={(e) => setAutor(e.target.value)}
                                    placeholder="Autor"
                                    className="rounded-xl border border-cinza-200 px-4 py-2.5 font-gabarito-regular text-sm outline-none focus:border-azul-600"
                                />
                                <input
                                    value={editora}
                                    onChange={(e) => setEditora(e.target.value)}
                                    placeholder="Editora"
                                    className="rounded-xl border border-cinza-200 px-4 py-2.5 font-gabarito-regular text-sm outline-none focus:border-azul-600"
                                />
                                <input
                                    value={isbn}
                                    onChange={(e) => setIsbn(e.target.value)}
                                    placeholder="ISBN"
                                    className="rounded-xl border border-cinza-200 px-4 py-2.5 font-gabarito-regular text-sm outline-none focus:border-azul-600"
                                />
                                <input
                                    type="number"
                                    value={paginas}
                                    onChange={(e) => setPaginas(e.target.value)}
                                    placeholder="Páginas"
                                    className="rounded-xl border border-cinza-200 px-4 py-2.5 font-gabarito-regular text-sm outline-none focus:border-azul-600"
                                />
                                <SelecionarCategoriasLivro
                                    categoriasIds={categoriasIds}
                                    categorias={categorias}
                                    onChange={setCategoriasIds}
                                    obrigatorio
                                />
                                {editando && (
                                    <select
                                        value={status}
                                        onChange={(e) => setStatus(e.target.value)}
                                        className="rounded-xl border border-cinza-200 px-4 py-2.5 font-gabarito-regular text-sm outline-none focus:border-azul-600"
                                    >
                                        <option value="ativo">Ativo</option>
                                        <option value="inativo">Inativo</option>
                                    </select>
                                )}
                                <textarea
                                    value={sinopse}
                                    onChange={(e) => setSinopse(e.target.value)}
                                    placeholder="Sinopse"
                                    rows={3}
                                    className="rounded-xl border border-cinza-200 px-4 py-2.5 font-gabarito-regular text-sm outline-none focus:border-azul-600"
                                />
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
                                    disabled={salvando || !titulo || !autor || categoriasIds.length === 0}
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
