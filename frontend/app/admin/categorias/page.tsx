"use client";

import Box from "@/app/components/Box";
import AdminPageHeader, { AdminAcoes, AdminNovoButton } from "@/app/components/admin/AdminPageHeader";
import AdminTable from "@/app/components/admin/AdminTable";
import CategoriaFormModal from "@/app/components/admin/CategoriaFormModal";
import type { CategoriaAdmin } from "@/types/admin";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

function formatarData(iso: string) {
    return new Date(iso).toLocaleDateString("pt-BR");
}

export default function AdminCategoriasPage() {
    const [categorias, setCategorias] = useState<CategoriaAdmin[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [modalAberto, setModalAberto] = useState(false);
    const [categoriaEditando, setCategoriaEditando] = useState<CategoriaAdmin | null>(null);

    const carregar = useCallback(async () => {
        setCarregando(true);
        try {
            const res = await fetch("/api/admin/categorias");
            if (res.ok) {
                const data = await res.json();
                setCategorias(Array.isArray(data) ? data : []);
            }
        } finally {
            setCarregando(false);
        }
    }, []);

    useEffect(() => {
        carregar();
    }, [carregar]);

    function abrirNovo() {
        setCategoriaEditando(null);
        setModalAberto(true);
    }

    function abrirEditar(categoria: CategoriaAdmin) {
        setCategoriaEditando(categoria);
        setModalAberto(true);
    }

    async function apagar(categoria: CategoriaAdmin) {
        if (!confirm(`Inativar a categoria "${categoria.nome_categoria}"?`)) return;
        const res = await fetch(`/api/admin/categorias/${categoria.id}`, { method: "DELETE" });
        if (res.ok) carregar();
    }

    return (
        <>
            <AdminPageHeader
                titulo="Categorias"
                acao={<AdminNovoButton label="Nova Categoria" onClick={abrirNovo} />}
            />

            <Box className="overflow-hidden p-0">
                {carregando ? (
                    <div className="flex justify-center py-16">
                        <Loader2 className="h-8 w-8 animate-spin text-azul-600" />
                    </div>
                ) : (
                    <AdminTable
                        data={categorias}
                        keyExtractor={(c) => c.id}
                        columns={[
                            { key: "nome", header: "Nome", render: (c) => c.nome_categoria },
                            {
                                key: "ativo",
                                header: "Ativo",
                                render: (c) => (
                                    <span
                                        className={`font-gabarito-medium ${c.ativo ? "text-emerald-600" : "text-red-500"}`}
                                    >
                                        {c.ativo ? "Sim" : "Não"}
                                    </span>
                                ),
                            },
                            {
                                key: "cadastro",
                                header: "Cadastro",
                                render: (c) => formatarData(c.criado_em),
                            },
                            {
                                key: "acao",
                                header: "Ação",
                                render: (c) => (
                                    <AdminAcoes
                                        onEditar={() => abrirEditar(c)}
                                        onApagar={() => apagar(c)}
                                    />
                                ),
                            },
                        ]}
                    />
                )}
            </Box>

            <CategoriaFormModal
                open={modalAberto}
                categoria={categoriaEditando}
                onClose={() => setModalAberto(false)}
                onSalvo={carregar}
            />
        </>
    );
}
