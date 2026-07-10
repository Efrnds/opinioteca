"use client";

import Box from "@/app/components/Box";
import { parseListaPaginada } from "@/lib/admin/paginacao";
import type { UsuarioAdmin } from "@/types/admin";
import type { AtribuirPlanoPayload, CodigoPlano } from "@/types/plano";
import { planoVitalicio, rotuloValidadePlano } from "@/types/plano";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Search } from "lucide-react";
import { useEffect, useState } from "react";

type AssinaturaFormModalProps = {
    open: boolean;
    usuario: UsuarioAdmin | null;
    /** Lista opcional; se vazia, a busca consulta a API */
    usuarios?: UsuarioAdmin[];
    onClose: () => void;
    onSalvo: () => void;
};

type ModoDuracao = "dias" | "meses" | "data";

function isPlanoPago(codigo: CodigoPlano) {
    return codigo === "opiniotop" || codigo === "opiniopro";
}

function resetFormulario(
    usuario: UsuarioAdmin | null,
    setters: {
        setCodigo: (c: CodigoPlano) => void;
        setVitalicia: (v: boolean) => void;
        setModoDuracao: (m: ModoDuracao) => void;
        setDuracao: (d: string) => void;
        setDataExpira: (d: string) => void;
        setErro: (e: string) => void;
    },
) {
    const codigoAtual = (usuario?.plano?.codigo ?? "opiniotop") as CodigoPlano;
    setters.setCodigo(isPlanoPago(codigoAtual) ? codigoAtual : "opiniotop");
    setters.setVitalicia(usuario ? planoVitalicio(usuario.plano) : false);
    setters.setModoDuracao("meses");
    setters.setDuracao("1");
    setters.setDataExpira("");
    setters.setErro("");
}

export default function AssinaturaFormModal({
    open,
    usuario,
    usuarios = [],
    onClose,
    onSalvo,
}: AssinaturaFormModalProps) {
    const [usuarioAtivo, setUsuarioAtivo] = useState<UsuarioAdmin | null>(null);
    const [buscaUsuario, setBuscaUsuario] = useState("");
    const [sugestoes, setSugestoes] = useState<UsuarioAdmin[]>([]);
    const [codigo, setCodigo] = useState<CodigoPlano>("opiniotop");
    const [vitalicia, setVitalicia] = useState(false);
    const [modoDuracao, setModoDuracao] = useState<ModoDuracao>("meses");
    const [duracao, setDuracao] = useState("1");
    const [dataExpira, setDataExpira] = useState("");
    const [salvando, setSalvando] = useState(false);
    const [erro, setErro] = useState("");

    const modoNova = !usuario;

    useEffect(() => {
        if (!open) return;
        setUsuarioAtivo(usuario);
        setBuscaUsuario("");
        setSugestoes([]);
        resetFormulario(usuario, {
            setCodigo,
            setVitalicia,
            setModoDuracao,
            setDuracao,
            setDataExpira,
            setErro,
        });
    }, [open, usuario]);

    useEffect(() => {
        if (!open || !modoNova) return;
        const termo = buscaUsuario.trim();
        if (termo.length < 2) {
            setSugestoes([]);
            return;
        }

        if (usuarios.length > 0) {
            const lower = termo.toLowerCase();
            setSugestoes(
                usuarios
                    .filter(
                        (u) =>
                            u.nick.toLowerCase().includes(lower) ||
                            u.nome.toLowerCase().includes(lower) ||
                            u.email.toLowerCase().includes(lower),
                    )
                    .slice(0, 8),
            );
            return;
        }

        const timer = setTimeout(async () => {
            const params = new URLSearchParams({
                q: termo,
                pagina: "1",
                limite: "8",
            });
            const res = await fetch(`/api/admin/usuarios?${params}`);
            if (!res.ok) return;
            const data = parseListaPaginada<UsuarioAdmin>(await res.json());
            setSugestoes(data.itens);
        }, 250);

        return () => clearTimeout(timer);
    }, [buscaUsuario, modoNova, open, usuarios]);

    function selecionarUsuario(u: UsuarioAdmin) {
        setUsuarioAtivo(u);
        setBuscaUsuario("");
        resetFormulario(u, {
            setCodigo,
            setVitalicia,
            setModoDuracao,
            setDuracao,
            setDataExpira,
            setErro,
        });
    }

    async function salvar() {
        if (!usuarioAtivo) return;
        setSalvando(true);
        setErro("");

        try {
            const payload: AtribuirPlanoPayload = { codigo };

            if (isPlanoPago(codigo)) {
                if (vitalicia) {
                    payload.vitalicia = true;
                } else if (modoDuracao === "dias") {
                    const n = parseInt(duracao, 10);
                    if (!Number.isFinite(n) || n < 1) {
                        throw new Error("Informe a duração em dias (mínimo 1)");
                    }
                    payload.duracaoDias = n;
                } else if (modoDuracao === "meses") {
                    const n = parseInt(duracao, 10);
                    if (!Number.isFinite(n) || n < 1) {
                        throw new Error("Informe a duração em meses (mínimo 1)");
                    }
                    payload.duracaoMeses = n;
                } else {
                    if (!dataExpira) {
                        throw new Error("Selecione a data de expiração");
                    }
                    const data = new Date(dataExpira);
                    if (Number.isNaN(data.getTime())) {
                        throw new Error("Data de expiração inválida");
                    }
                    payload.expiraEm = data.toISOString();
                }
            }

            const res = await fetch(`/api/admin/usuarios/${usuarioAtivo.id}/assinatura`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.erro ?? "Erro ao atribuir plano");
            }

            onSalvo();
            onClose();
        } catch (e) {
            setErro(e instanceof Error ? e.message : "Erro ao salvar");
        } finally {
            setSalvando(false);
        }
    }

    const validadeAtual = usuarioAtivo ? rotuloValidadePlano(usuarioAtivo.plano) : null;

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
                                {modoNova
                                    ? usuarioAtivo
                                        ? `Nova assinatura: ${usuarioAtivo.nome}`
                                        : "Nova assinatura"
                                    : `Assinatura: ${usuarioAtivo?.nome ?? ""}`}
                            </h2>

                            {modoNova && !usuarioAtivo ? (
                                <>
                                    <p className="mt-1 font-gabarito-regular text-sm text-cinza-700">
                                        Busque o usuário pelo nick, nome ou e-mail.
                                    </p>
                                    <div className="relative mt-4">
                                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cinza-400" />
                                        <input
                                            type="search"
                                            value={buscaUsuario}
                                            onChange={(e) => setBuscaUsuario(e.target.value)}
                                            placeholder="Nick, nome ou e-mail..."
                                            autoFocus
                                            className="w-full rounded-xl border border-cinza-200 py-2.5 pl-10 pr-4 font-gabarito-regular text-sm text-azul-900 outline-none focus:border-azul-600"
                                        />
                                        {sugestoes.length > 0 && (
                                            <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-cinza-200 bg-white py-1">
                                                {sugestoes.map((u) => (
                                                    <button
                                                        key={u.id}
                                                        type="button"
                                                        onClick={() => selecionarUsuario(u)}
                                                        className="flex w-full items-center justify-between px-4 py-2.5 text-left font-gabarito-regular text-sm transition hover:bg-background"
                                                    >
                                                        <span>
                                                            <span className="font-gabarito-medium text-azul-900">
                                                                @{u.nick}
                                                            </span>{" "}
                                                            <span className="text-cinza-600">
                                                                · {u.nome}
                                                            </span>
                                                            <span className="mt-0.5 block text-xs text-cinza-500">
                                                                {u.email}
                                                            </span>
                                                        </span>
                                                        <span className="shrink-0 text-xs text-cinza-500">
                                                            {u.plano?.nome ?? "Gratuito"}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        {buscaUsuario.trim().length >= 2 && sugestoes.length === 0 && (
                                            <p className="mt-2 font-gabarito-regular text-sm text-cinza-600">
                                                Nenhum usuário encontrado.
                                            </p>
                                        )}
                                    </div>
                                    <div className="mt-6 flex justify-end">
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="rounded-full px-5 py-2 font-gabarito-medium text-sm text-cinza-700 hover:bg-background"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </>
                            ) : usuarioAtivo ? (
                                <>
                                    <p className="mt-1 font-gabarito-regular text-sm text-cinza-700">
                                        Plano atual: {usuarioAtivo.plano?.nome ?? "Gratuito"}
                                        {validadeAtual ? ` · ${validadeAtual}` : ""}
                                    </p>
                                    {modoNova && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setUsuarioAtivo(null);
                                                setBuscaUsuario("");
                                                setErro("");
                                            }}
                                            className="mt-1 font-gabarito-medium text-xs text-azul-600 hover:underline"
                                        >
                                            Trocar usuário
                                        </button>
                                    )}
                                    <p className="mt-1 font-gabarito-regular text-xs text-cinza-500">
                                        Altere o plano e salve. Não é necessário revogar antes.
                                    </p>

                                    <div className="mt-4 flex flex-col gap-3">
                                        <label className="flex flex-col gap-1">
                                            <span className="font-gabarito-medium text-sm text-azul-900">
                                                Plano
                                            </span>
                                            <select
                                                value={codigo}
                                                onChange={(e) =>
                                                    setCodigo(e.target.value as CodigoPlano)
                                                }
                                                className="rounded-xl border border-cinza-200 px-4 py-2.5 font-gabarito-regular text-sm outline-none focus:border-azul-600"
                                            >
                                                <option value="gratuito">Gratuito</option>
                                                <option value="opiniotop">
                                                    OpinioTop (R$ 9,99/mês)
                                                </option>
                                                <option value="opiniopro">
                                                    OpinioPro (R$ 19,99/mês)
                                                </option>
                                            </select>
                                        </label>

                                        {isPlanoPago(codigo) && (
                                            <>
                                                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-cinza-200 px-4 py-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={vitalicia}
                                                        onChange={(e) =>
                                                            setVitalicia(e.target.checked)
                                                        }
                                                        className="h-4 w-4 rounded border-cinza-300 text-azul-600 focus:ring-azul-500"
                                                    />
                                                    <span className="flex flex-col">
                                                        <span className="font-gabarito-medium text-sm text-azul-900">
                                                            Assinatura vitalícia
                                                        </span>
                                                        <span className="font-gabarito-regular text-xs text-cinza-600">
                                                            Sem data de expiração: plano nunca
                                                            expira
                                                        </span>
                                                    </span>
                                                </label>

                                                {!vitalicia && (
                                                    <>
                                                        <label className="flex flex-col gap-1">
                                                            <span className="font-gabarito-medium text-sm text-azul-900">
                                                                Duração
                                                            </span>
                                                            <select
                                                                value={modoDuracao}
                                                                onChange={(e) =>
                                                                    setModoDuracao(
                                                                        e.target
                                                                            .value as ModoDuracao,
                                                                    )
                                                                }
                                                                className="rounded-xl border border-cinza-200 px-4 py-2.5 font-gabarito-regular text-sm outline-none focus:border-azul-600"
                                                            >
                                                                <option value="dias">Dias</option>
                                                                <option value="meses">Meses</option>
                                                                <option value="data">
                                                                    Data específica
                                                                </option>
                                                            </select>
                                                        </label>

                                                        {modoDuracao === "data" ? (
                                                            <input
                                                                type="date"
                                                                value={dataExpira}
                                                                min={new Date()
                                                                    .toISOString()
                                                                    .slice(0, 10)}
                                                                onChange={(e) =>
                                                                    setDataExpira(e.target.value)
                                                                }
                                                                className="rounded-xl border border-cinza-200 px-4 py-2.5 font-gabarito-regular text-sm outline-none focus:border-azul-600"
                                                            />
                                                        ) : (
                                                            <input
                                                                type="number"
                                                                min={1}
                                                                value={duracao}
                                                                onChange={(e) =>
                                                                    setDuracao(e.target.value)
                                                                }
                                                                placeholder={
                                                                    modoDuracao === "dias"
                                                                        ? "Dias"
                                                                        : "Meses"
                                                                }
                                                                className="rounded-xl border border-cinza-200 px-4 py-2.5 font-gabarito-regular text-sm outline-none focus:border-azul-600"
                                                            />
                                                        )}
                                                    </>
                                                )}
                                            </>
                                        )}
                                    </div>

                                    {erro && <p className="mt-3 text-sm text-red-500">{erro}</p>}

                                    <div className="mt-6 flex flex-wrap justify-end gap-3">
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
                                            disabled={salvando}
                                            className="flex items-center gap-2 rounded-full bg-azul-600 px-5 py-2 font-gabarito-bold text-sm text-white hover:bg-azul-500 disabled:opacity-50"
                                        >
                                            {salvando && (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            )}
                                            Salvar
                                        </button>
                                    </div>
                                </>
                            ) : null}
                        </Box>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
