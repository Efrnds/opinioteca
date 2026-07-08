"use client";

import Box from "@/app/components/Box";
import AdminPageHeader, { AdminAcoes, AdminNovoButton } from "@/app/components/admin/AdminPageHeader";
import AdminTable from "@/app/components/admin/AdminTable";
import TemplateFormModal from "@/app/components/admin/TemplateFormModal";
import type { TemplateAdmin } from "@/types/template";
import { PLANO_BADGE, type CodigoPlano } from "@/types/plano";
import { previewTemplate } from "@/types/template";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

function PlanoBadge({ codigo }: { codigo?: string }) {
    if (!codigo) {
        return <span className="text-cinza-600">—</span>;
    }
    const badge = PLANO_BADGE[codigo as CodigoPlano];
    if (!badge) {
        return <span className="text-cinza-700">{codigo}</span>;
    }
    return (
        <span className={`rounded-full px-2.5 py-0.5 font-gabarito-medium text-xs ${badge.cor}`}>
            {badge.rotulo}
        </span>
    );
}

export default function AdminTemplatesPage() {
    const [templates, setTemplates] = useState<TemplateAdmin[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [modalAberto, setModalAberto] = useState(false);
    const [templateEditando, setTemplateEditando] = useState<TemplateAdmin | null>(null);

    const carregar = useCallback(async () => {
        setCarregando(true);
        try {
            const res = await fetch("/api/admin/templates");
            if (res.ok) {
                const data = await res.json();
                setTemplates(Array.isArray(data) ? data : []);
            }
        } finally {
            setCarregando(false);
        }
    }, []);

    useEffect(() => {
        carregar();
    }, [carregar]);

    function abrirNovo() {
        setTemplateEditando(null);
        setModalAberto(true);
    }

    function abrirEditar(template: TemplateAdmin) {
        setTemplateEditando(template);
        setModalAberto(true);
    }

    async function apagar(template: TemplateAdmin) {
        if (!confirm(`Excluir o template "${template.nome}"? Se estiver em uso, será inativado.`)) {
            return;
        }
        const res = await fetch(`/api/admin/templates/${template.id}`, { method: "DELETE" });
        if (res.ok) {
            const data = await res.json().catch(() => null);
            if (data?.mensagem) {
                alert(data.mensagem);
            }
            carregar();
        }
    }

    return (
        <>
            <AdminPageHeader
                titulo="Templates de Resenha"
                acao={<AdminNovoButton label="Novo Template" onClick={abrirNovo} />}
            />

            <Box className="overflow-hidden p-0">
                {carregando ? (
                    <div className="flex justify-center py-16">
                        <Loader2 className="h-8 w-8 animate-spin text-azul-600" />
                    </div>
                ) : (
                    <AdminTable
                        data={templates}
                        keyExtractor={(t) => t.id}
                        emptyMessage="Nenhum template cadastrado."
                        columns={[
                            {
                                key: "nome",
                                header: "Nome",
                                render: (t) => (
                                    <div>
                                        <p className="font-gabarito-medium text-azul-900">{t.nome}</p>
                                        {t.estrutura_json?.descricao && (
                                            <p className="text-xs text-cinza-600">
                                                {t.estrutura_json.descricao}
                                            </p>
                                        )}
                                    </div>
                                ),
                            },
                            {
                                key: "plano",
                                header: "Plano mínimo",
                                render: (t) => (
                                    <PlanoBadge codigo={t.assinatura_minima_codigo} />
                                ),
                            },
                            {
                                key: "preview",
                                header: "Prévia",
                                render: (t) => (
                                    <span className="line-clamp-2 max-w-xs font-gabarito-regular text-xs text-cinza-700">
                                        {previewTemplate(t.estrutura_json?.texto ?? "")}
                                    </span>
                                ),
                            },
                            {
                                key: "ordem",
                                header: "Ordem",
                                render: (t) => t.ordem,
                            },
                            {
                                key: "ativo",
                                header: "Ativo",
                                render: (t) => (
                                    <span
                                        className={`font-gabarito-medium ${t.ativo ? "text-emerald-600" : "text-red-500"}`}
                                    >
                                        {t.ativo ? "Sim" : "Não"}
                                    </span>
                                ),
                            },
                            {
                                key: "acao",
                                header: "Ação",
                                render: (t) => (
                                    <AdminAcoes
                                        onEditar={() => abrirEditar(t)}
                                        onApagar={() => apagar(t)}
                                    />
                                ),
                            },
                        ]}
                    />
                )}
            </Box>

            <TemplateFormModal
                open={modalAberto}
                template={templateEditando}
                onClose={() => setModalAberto(false)}
                onSalvo={carregar}
            />
        </>
    );
}
