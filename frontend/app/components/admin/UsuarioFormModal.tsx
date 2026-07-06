"use client";

import Box from "@/app/components/Box";
import type { AtualizarUsuarioAdminPayload, CriarUsuarioAdminPayload, UsuarioAdmin } from "@/types/admin";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

type UsuarioFormModalProps = {
    open: boolean;
    usuario?: UsuarioAdmin | null;
    onClose: () => void;
    onSalvo: () => void;
};

export default function UsuarioFormModal({ open, usuario, onClose, onSalvo }: UsuarioFormModalProps) {
    const editando = !!usuario;
    const [nome, setNome] = useState("");
    const [nick, setNick] = useState("");
    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");
    const [status, setStatus] = useState("ativo");
    const [isAdmin, setIsAdmin] = useState(false);
    const [salvando, setSalvando] = useState(false);
    const [erro, setErro] = useState("");

    useEffect(() => {
        if (open) {
            setNome(usuario?.nome ?? "");
            setNick(usuario?.nick ?? "");
            setEmail(usuario?.email ?? "");
            setSenha("");
            setStatus(usuario?.status ?? "ativo");
            setIsAdmin(usuario?.isAdmin ?? false);
            setErro("");
        }
    }, [open, usuario]);

    async function salvar() {
        setSalvando(true);
        setErro("");

        try {
            if (editando && usuario) {
                const payload: AtualizarUsuarioAdminPayload = {
                    nome,
                    nick,
                    email,
                    status,
                    isAdmin,
                };
                const res = await fetch(`/api/admin/usuarios/${usuario.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
                if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    throw new Error(data.erro ?? "Erro ao atualizar usuário");
                }
            } else {
                const payload: CriarUsuarioAdminPayload = {
                    nome,
                    nick,
                    email,
                    senha,
                    isAdmin,
                };
                const res = await fetch("/api/admin/usuarios", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ...payload, senha }),
                });
                if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    throw new Error(data.erro ?? "Erro ao criar usuário");
                }
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
                        <Box className="w-full max-w-lg p-6 shadow-xl">
                            <h2 className="font-gabarito-bold text-xl text-azul-900">
                                {editando ? "Editar Usuário" : "Novo Usuário"}
                            </h2>

                            <div className="mt-4 flex flex-col gap-3">
                                <input
                                    value={nome}
                                    onChange={(e) => setNome(e.target.value)}
                                    placeholder="Nome"
                                    className="rounded-xl border border-cinza-200 px-4 py-2.5 font-gabarito-regular text-sm outline-none focus:border-azul-600"
                                />
                                <input
                                    value={nick}
                                    onChange={(e) => setNick(e.target.value)}
                                    placeholder="Nick"
                                    className="rounded-xl border border-cinza-200 px-4 py-2.5 font-gabarito-regular text-sm outline-none focus:border-azul-600"
                                />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="E-mail"
                                    className="rounded-xl border border-cinza-200 px-4 py-2.5 font-gabarito-regular text-sm outline-none focus:border-azul-600"
                                />
                                {!editando && (
                                    <input
                                        type="password"
                                        value={senha}
                                        onChange={(e) => setSenha(e.target.value)}
                                        placeholder="Senha"
                                        className="rounded-xl border border-cinza-200 px-4 py-2.5 font-gabarito-regular text-sm outline-none focus:border-azul-600"
                                    />
                                )}
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
                                <label className="flex items-center gap-2 font-gabarito-regular text-sm text-azul-900">
                                    <input
                                        type="checkbox"
                                        checked={isAdmin}
                                        onChange={(e) => setIsAdmin(e.target.checked)}
                                    />
                                    Administrador
                                </label>
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
                                    disabled={salvando || !nome || !nick || !email || (!editando && !senha)}
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
