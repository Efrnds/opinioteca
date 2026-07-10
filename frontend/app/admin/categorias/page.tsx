"use client";

import Box from "@/app/components/Box";
import AdminPageHeader, { AdminAcoes, AdminNovoButton } from "@/app/components/admin/AdminPageHeader";
import AdminPaginacao from "@/app/components/admin/AdminPaginacao";
import AdminTable from "@/app/components/admin/AdminTable";
import CategoriaFormModal from "@/app/components/admin/CategoriaFormModal";
import { ADMIN_PAGE_SIZE, paramsPaginacao, parseListaPaginada } from "@/lib/admin/paginacao";
import type { CategoriaAdmin } from "@/types/admin";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

function formatarData(iso: string) {
    return new Date(iso).toLocaleDateString("pt-BR");
}

export default function AdminCategoriasPage() {
    const [categorias, setCategorias] = useState<CategoriaAdmin[]>([]);
    const [pagina, setPagina] = useState(1);
    const [total, setTotal] = useState(0);
    const [limite, setLimite] = useState(ADMIN_PAGE_SIZE);
    const [carregando, setCarregando] = useState(true);
    const [modalAberto, setModalAberto] = useState(false);
    const [categoriaEditando, setCategoriaEditando] = useState<CategoriaAdmin | null>(null);

    const carregar = useCallback(async () => {
        setCarregando(true);
        try {
            const params = paramsPaginacao(pagina);
            const res = await fetch(`/api/admin/categorias?${params}`);
            if (res.ok) {
                const data = parseListaPaginada<CategoriaAdmin>(await res.json());
                setCategorias(data.itens);
                setTotal(data.total);
                setLimite(data.limite);
            }
        } finally {
            setCarregando(false);
        }
    }, [pagina]);

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
                    <>
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
                        <AdminPaginacao
                            pagina={pagina}
                            limite={limite}
                            total={total}
                            onChange={setPagina}
                            disabled={carregando}
                        />
                    </>
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
