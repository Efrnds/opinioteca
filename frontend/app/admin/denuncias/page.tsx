"use client";

import Box from "@/app/components/Box";
import AdminPageHeader from "@/app/components/admin/AdminPageHeader";
import AdminTable from "@/app/components/admin/AdminTable";
import type { AcaoResolucaoDenuncia, DenunciaAdminDetalhe, DenunciaAdminListItem } from "@/types/admin";
import { MOTIVOS_DENUNCIA } from "@/types/denuncia";
import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, Loader2, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

const TIPOS_ENTIDADE = [
    { value: "", label: "Todos os tipos" },
    { value: "avaliacao", label: "Avaliação" },
    { value: "comentario", label: "Comentário" },
    { value: "usuario", label: "Usuário" },
    { value: "mensagem", label: "Mensagem" },
];

const STATUS_OPCOES = [
    { value: "", label: "Todos os status" },
    { value: "pendente", label: "Pendente" },
    { value: "em_analise", label: "Em análise" },
    { value: "resolvida", label: "Resolvida" },
    { value: "rejeitada", label: "Rejeitada" },
];

function formatarData(iso: string) {
    return new Date(iso).toLocaleString("pt-BR");
}

function labelMotivo(motivo: string) {
    return MOTIVOS_DENUNCIA.find((m) => m.value === motivo)?.label ?? motivo;
}

function labelTipo(tipo: string) {
    return TIPOS_ENTIDADE.find((t) => t.value === tipo)?.label ?? tipo;
}

function ContagemDenunciasBadge({
    total,
    procedentes,
}: {
    total: number;
    procedentes: number;
}) {
    if (total <= 0) return <span className="text-cinza-400">—</span>;
    return (
        <span className="font-gabarito-regular text-sm text-cinza-700" title="Total / procedentes (limite auto-ban: 3)">
            {total}
            {procedentes > 0 && (
                <span className={procedentes >= 3 ? " font-gabarito-bold text-red-600" : " text-amber-700"}>
                    {" "}
                    ({procedentes} proc.)
                </span>
            )}
        </span>
    );
}

function StatusBadge({ status }: { status: string }) {
    const cores: Record<string, string> = {
        pendente: "bg-amber-100 text-amber-800",
        em_analise: "bg-blue-100 text-blue-800",
        resolvida: "bg-emerald-100 text-emerald-800",
        rejeitada: "bg-gray-100 text-gray-700",
    };
    return (
        <span
            className={`rounded-full px-2.5 py-0.5 font-gabarito-medium text-xs capitalize ${cores[status] ?? "bg-gray-100 text-gray-700"}`}
        >
            {status.replace("_", " ")}
        </span>
    );
}

function ContextoDenuncia({ detalhe }: { detalhe: DenunciaAdminDetalhe }) {
    const ctx = detalhe.contexto;

    if (detalhe.tipo_entidade === "avaliacao" && "nota" in ctx) {
        return (
            <div className="space-y-2">
                <p className="font-gabarito-regular text-sm text-cinza-700">
                    Autor:{" "}
                    <Link href={`/perfil/${ctx.autor_nick}`} className="text-azul-600 hover:underline">
                        @{ctx.autor_nick}
                    </Link>{" "}
                    · Nota: {ctx.nota}/5
                </p>
                <p className="whitespace-pre-wrap rounded-xl bg-background p-3 font-gabarito-regular text-sm text-azul-900">
                    {ctx.texto || "(sem texto)"}
                </p>
                <Link
                    href={`/avaliacoes/${ctx.id}`}
                    className="inline-flex items-center gap-1 font-gabarito-medium text-sm text-azul-600 hover:underline"
                >
                    Ver avaliação <ExternalLink className="h-3.5 w-3.5" />
                </Link>
            </div>
        );
    }

    if (detalhe.tipo_entidade === "comentario" && "avaliacao_id" in ctx) {
        return (
            <div className="space-y-2">
                <p className="font-gabarito-regular text-sm text-cinza-700">
                    Autor:{" "}
                    <Link href={`/perfil/${ctx.autor_nick}`} className="text-azul-600 hover:underline">
                        @{ctx.autor_nick}
                    </Link>
                </p>
                <p className="whitespace-pre-wrap rounded-xl bg-background p-3 font-gabarito-regular text-sm text-azul-900">
                    {ctx.texto}
                </p>
                <Link
                    href={`/avaliacoes/${ctx.avaliacao_id}`}
                    className="inline-flex items-center gap-1 font-gabarito-medium text-sm text-azul-600 hover:underline"
                >
                    Ver post pai <ExternalLink className="h-3.5 w-3.5" />
                </Link>
            </div>
        );
    }

    if (detalhe.tipo_entidade === "usuario" && "email" in ctx) {
        return (
            <div className="space-y-2">
                <p className="font-gabarito-regular text-sm text-cinza-700">
                    <span className="font-gabarito-bold text-azul-900">{ctx.nome}</span> · {ctx.email}
                </p>
                <Link
                    href={`/perfil/${ctx.nick}`}
                    className="inline-flex items-center gap-1 font-gabarito-medium text-sm text-azul-600 hover:underline"
                >
                    Ver perfil <ExternalLink className="h-3.5 w-3.5" />
                </Link>
            </div>
        );
    }

    if (detalhe.tipo_entidade === "mensagem" && "remetente_nick" in ctx) {
        return (
            <div className="space-y-2">
                <p className="font-gabarito-regular text-sm text-cinza-700">
                    Remetente:{" "}
                    <Link href={`/perfil/${ctx.remetente_nick}`} className="text-azul-600 hover:underline">
                        @{ctx.remetente_nick}
                    </Link>{" "}
                    · {formatarData(ctx.criado_em)}
                </p>
                <p className="whitespace-pre-wrap rounded-xl bg-background p-3 font-gabarito-regular text-sm text-azul-900">
                    {ctx.texto || "(sem texto)"}
                </p>
            </div>
        );
    }

    return null;
}

type DenunciaDetalheModalProps = {
    denunciaId: number | null;
    onClose: () => void;
    onResolvida: () => void;
};

function DenunciaDetalheModal({ denunciaId, onClose, onResolvida }: DenunciaDetalheModalProps) {
    const [detalhe, setDetalhe] = useState<DenunciaAdminDetalhe | null>(null);
    const [carregando, setCarregando] = useState(false);
    const [resolucao, setResolucao] = useState("");
    const [resolvendo, setResolvendo] = useState(false);
    const [erro, setErro] = useState("");

    useEffect(() => {
        if (!denunciaId) {
            setDetalhe(null);
            return;
        }

        setCarregando(true);
        setErro("");
        setResolucao("");

        fetch(`/api/admin/denuncias/${denunciaId}`)
            .then(async (res) => {
                const data = await res.json();
                if (!res.ok) throw new Error(data.erro ?? "Erro ao carregar denúncia");
                setDetalhe(data);
            })
            .catch((e) => setErro(e instanceof Error ? e.message : "Erro ao carregar"))
            .finally(() => setCarregando(false));
    }, [denunciaId]);

    async function resolver(acao: AcaoResolucaoDenuncia) {
        if (!denunciaId) return;
        if (acao === "advertir" && !resolucao.trim()) {
            setErro("Informe o texto da advertência.");
            return;
        }

        setResolvendo(true);
        setErro("");

        try {
            const res = await fetch(`/api/admin/denuncias/${denunciaId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ acao, resolucao: resolucao.trim() }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.erro ?? "Erro ao resolver denúncia");
            }

            toast.success("Denúncia resolvida.");
            onResolvida();
            onClose();
        } catch (e) {
            setErro(e instanceof Error ? e.message : "Erro ao resolver");
        } finally {
            setResolvendo(false);
        }
    }

    const pendente = detalhe?.status === "pendente" || detalhe?.status === "em_analise";

    return (
        <AnimatePresence>
            {denunciaId && (
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
                        className="max-h-[90vh] w-full max-w-lg overflow-y-auto"
                    >
                        <Box className="p-6 shadow-xl">
                            <div className="mb-4 flex items-start justify-between gap-3">
                                <h2 className="font-gabarito-bold text-xl text-azul-900">
                                    Denúncia #{denunciaId}
                                </h2>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="rounded-full p-1 text-cinza-600 transition hover:bg-background"
                                    aria-label="Fechar"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {carregando && (
                                <div className="flex justify-center py-12">
                                    <Loader2 className="h-8 w-8 animate-spin text-azul-600" />
                                </div>
                            )}

                            {!carregando && detalhe && (
                                <div className="flex flex-col gap-4">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <StatusBadge status={detalhe.status} />
                                        <span className="font-gabarito-regular text-sm text-cinza-700">
                                            {labelTipo(detalhe.tipo_entidade)} · {labelMotivo(detalhe.motivo)}
                                        </span>
                                    </div>

                                    {(detalhe.denuncias_contra_usuario > 0 || detalhe.denuncias_procedentes > 0) && (
                                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                                            <p className="font-gabarito-medium text-xs text-amber-800">
                                                Histórico contra o denunciado
                                            </p>
                                            <p className="font-gabarito-regular text-sm text-amber-900">
                                                {detalhe.denuncias_contra_usuario} denúncia
                                                {detalhe.denuncias_contra_usuario !== 1 ? "s" : ""} no total
                                                {detalhe.denuncias_procedentes > 0 && (
                                                    <>
                                                        {" "}
                                                        · {detalhe.denuncias_procedentes} procedente
                                                        {detalhe.denuncias_procedentes !== 1 ? "s" : ""}
                                                        {detalhe.denuncias_procedentes >= 3 && " (limite de auto-ban atingido)"}
                                                    </>
                                                )}
                                            </p>
                                        </div>
                                    )}

                                    <div className="rounded-xl border border-gray-200 bg-white p-3">
                                        <p className="font-gabarito-medium text-xs text-cinza-500">Denunciante</p>
                                        <p className="font-gabarito-bold text-sm text-azul-900">
                                            {detalhe.denunciante_nome}{" "}
                                            <span className="font-gabarito-regular text-cinza-600">
                                                @{detalhe.denunciante_nick}
                                            </span>
                                        </p>
                                        <p className="mt-1 font-gabarito-regular text-xs text-cinza-500">
                                            {formatarData(detalhe.criado_em)}
                                        </p>
                                    </div>

                                    {detalhe.descricao && (
                                        <div>
                                            <p className="mb-1 font-gabarito-medium text-sm text-azul-900">Descrição</p>
                                            <p className="whitespace-pre-wrap rounded-xl bg-background p-3 font-gabarito-regular text-sm text-azul-900">
                                                {detalhe.descricao}
                                            </p>
                                        </div>
                                    )}

                                    <div>
                                        <p className="mb-2 font-gabarito-medium text-sm text-azul-900">
                                            Conteúdo denunciado
                                        </p>
                                        <ContextoDenuncia detalhe={detalhe} />
                                    </div>

                                    {detalhe.resolucao && (
                                        <div>
                                            <p className="mb-1 font-gabarito-medium text-sm text-azul-900">Resolução</p>
                                            <p className="rounded-xl bg-emerald-50 p-3 font-gabarito-regular text-sm text-emerald-900">
                                                {detalhe.resolucao}
                                            </p>
                                        </div>
                                    )}

                                    {pendente && (
                                        <div className="border-t border-gray-200 pt-4">
                                            <p className="mb-2 font-gabarito-medium text-sm text-azul-900">
                                                Ação de moderação
                                            </p>
                                            <textarea
                                                value={resolucao}
                                                onChange={(e) => setResolucao(e.target.value)}
                                                rows={3}
                                                placeholder="Nota de resolução ou texto da advertência..."
                                                className="mb-3 w-full resize-none rounded-xl border-2 border-gray-200 bg-white px-3 py-2 font-gabarito-regular text-sm text-azul-900 outline-none focus:border-azul-600"
                                            />
                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    type="button"
                                                    disabled={resolvendo}
                                                    onClick={() => resolver("rejeitar")}
                                                    className="rounded-full border border-gray-300 px-3 py-2 font-gabarito-medium text-sm text-cinza-700 transition hover:bg-gray-50 disabled:opacity-60"
                                                >
                                                    Rejeitar
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={resolvendo}
                                                    onClick={() => resolver("remover_conteudo")}
                                                    className="rounded-full bg-red-500 px-3 py-2 font-gabarito-medium text-sm text-white transition hover:bg-red-600 disabled:opacity-60"
                                                >
                                                    Remover conteúdo
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={resolvendo}
                                                    onClick={() => resolver("advertir")}
                                                    className="rounded-full border border-amber-400 px-3 py-2 font-gabarito-medium text-sm text-amber-700 transition hover:bg-amber-50 disabled:opacity-60"
                                                >
                                                    Advertir usuário
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={resolvendo}
                                                    onClick={() => resolver("inativar_usuario")}
                                                    className="rounded-full bg-azul-900 px-3 py-2 font-gabarito-medium text-sm text-white transition hover:bg-azul-800 disabled:opacity-60"
                                                >
                                                    Inativar usuário
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {erro && (
                                        <p className="text-center font-gabarito-regular text-sm text-red-600">{erro}</p>
                                    )}
                                </div>
                            )}
                        </Box>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default function AdminDenunciasPage() {
    const [itens, setItens] = useState<DenunciaAdminListItem[]>([]);
    const [pendentes, setPendentes] = useState(0);
    const [carregando, setCarregando] = useState(true);
    const [filtroStatus, setFiltroStatus] = useState("");
    const [filtroTipo, setFiltroTipo] = useState("");
    const [detalheId, setDetalheId] = useState<number | null>(null);

    const carregar = useCallback(async () => {
        setCarregando(true);
        try {
            const params = new URLSearchParams();
            if (filtroStatus) params.set("status", filtroStatus);
            if (filtroTipo) params.set("tipo", filtroTipo);
            const qs = params.toString();
            const res = await fetch(qs ? `/api/admin/denuncias?${qs}` : "/api/admin/denuncias");
            if (res.ok) {
                const data = await res.json();
                setItens(Array.isArray(data.itens) ? data.itens : []);
                setPendentes(typeof data.pendentes === "number" ? data.pendentes : 0);
            }
        } finally {
            setCarregando(false);
        }
    }, [filtroStatus, filtroTipo]);

    useEffect(() => {
        carregar();
    }, [carregar]);

    return (
        <>
            <AdminPageHeader
                titulo="Denúncias"
                acao={
                    pendentes > 0 ? (
                        <span className="rounded-full bg-amber-500 px-3 py-1 font-gabarito-bold text-sm text-white">
                            {pendentes} pendente{pendentes !== 1 ? "s" : ""}
                        </span>
                    ) : undefined
                }
            />

            <Box className="mb-4 flex flex-wrap gap-3 p-4">
                <select
                    value={filtroStatus}
                    onChange={(e) => setFiltroStatus(e.target.value)}
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 font-gabarito-regular text-sm text-azul-900 outline-none focus:border-azul-600"
                >
                    {STATUS_OPCOES.map((op) => (
                        <option key={op.value} value={op.value}>
                            {op.label}
                        </option>
                    ))}
                </select>
                <select
                    value={filtroTipo}
                    onChange={(e) => setFiltroTipo(e.target.value)}
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 font-gabarito-regular text-sm text-azul-900 outline-none focus:border-azul-600"
                >
                    {TIPOS_ENTIDADE.map((op) => (
                        <option key={op.value} value={op.value}>
                            {op.label}
                        </option>
                    ))}
                </select>
            </Box>

            <Box className="overflow-hidden p-0">
                {carregando ? (
                    <div className="flex justify-center py-16">
                        <Loader2 className="h-8 w-8 animate-spin text-azul-600" />
                    </div>
                ) : (
                    <AdminTable
                        data={itens}
                        keyExtractor={(d) => d.id}
                        emptyMessage="Nenhuma denúncia encontrada."
                        columns={[
                            {
                                key: "tipo",
                                header: "Tipo",
                                render: (d) => labelTipo(d.tipo_entidade),
                            },
                            {
                                key: "motivo",
                                header: "Motivo",
                                render: (d) => labelMotivo(d.motivo),
                            },
                            {
                                key: "denunciante",
                                header: "Denunciante",
                                render: (d) => `@${d.denunciante_nick}`,
                            },
                            {
                                key: "data",
                                header: "Data",
                                render: (d) => formatarData(d.criado_em),
                            },
                            {
                                key: "denuncias",
                                header: "Contra usuário",
                                render: (d) => (
                                    <ContagemDenunciasBadge
                                        total={d.denuncias_contra_usuario ?? 0}
                                        procedentes={d.denuncias_procedentes ?? 0}
                                    />
                                ),
                            },
                            {
                                key: "status",
                                header: "Status",
                                render: (d) => <StatusBadge status={d.status} />,
                            },
                            {
                                key: "acao",
                                header: "Ação",
                                render: (d) => (
                                    <button
                                        type="button"
                                        onClick={() => setDetalheId(d.id)}
                                        className="font-gabarito-medium text-sm text-azul-600 hover:underline"
                                    >
                                        Ver detalhes
                                    </button>
                                ),
                            },
                        ]}
                    />
                )}
            </Box>

            <DenunciaDetalheModal
                denunciaId={detalheId}
                onClose={() => setDetalheId(null)}
                onResolvida={carregar}
            />
        </>
    );
}
