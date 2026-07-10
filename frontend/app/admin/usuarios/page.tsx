"use client";

import Box from "@/app/components/Box";
import AdminPageHeader, {
    AdminAcoes,
    AdminNovoButton,
    AdminStatusBadge,
} from "@/app/components/admin/AdminPageHeader";
import AdminPaginacao from "@/app/components/admin/AdminPaginacao";
import AdminTable from "@/app/components/admin/AdminTable";
import UsuarioFormModal from "@/app/components/admin/UsuarioFormModal";
import { ADMIN_PAGE_SIZE, paramsPaginacao, parseListaPaginada } from "@/lib/admin/paginacao";
import type { UsuarioAdmin } from "@/types/admin";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

function formatarData(iso: string) {
    return new Date(iso).toLocaleDateString("pt-BR");
}

export default function AdminUsuariosPage() {
    const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
    const [pagina, setPagina] = useState(1);
    const [total, setTotal] = useState(0);
    const [limite, setLimite] = useState(ADMIN_PAGE_SIZE);
    const [carregando, setCarregando] = useState(true);
    const [modalAberto, setModalAberto] = useState(false);
    const [usuarioEditando, setUsuarioEditando] = useState<UsuarioAdmin | null>(null);

    const carregar = useCallback(async () => {
        setCarregando(true);
        try {
            const params = paramsPaginacao(pagina);
            const res = await fetch(`/api/admin/usuarios?${params}`);
            if (res.ok) {
                const data = parseListaPaginada<UsuarioAdmin>(await res.json());
                setUsuarios(data.itens);
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
        setUsuarioEditando(null);
        setModalAberto(true);
    }

    function abrirEditar(usuario: UsuarioAdmin) {
        setUsuarioEditando(usuario);
        setModalAberto(true);
    }

    async function apagar(usuario: UsuarioAdmin) {
        if (!confirm(`Inativar o usuário ${usuario.nome}?`)) return;
        const res = await fetch(`/api/admin/usuarios/${usuario.id}`, { method: "DELETE" });
        if (res.ok) carregar();
    }

    return (
        <>
            <AdminPageHeader
                titulo="Usuários"
                acao={<AdminNovoButton label="Novo Usuário" onClick={abrirNovo} />}
            />

            <Box className="overflow-hidden p-0">
                {carregando ? (
                    <div className="flex justify-center py-16">
                        <Loader2 className="h-8 w-8 animate-spin text-azul-600" />
                    </div>
                ) : (
                    <>
                        <AdminTable
                            data={usuarios}
                            keyExtractor={(u) => u.id}
                            columns={[
                                { key: "nome", header: "Nome", render: (u) => u.nome },
                                {
                                    key: "status",
                                    header: "Status",
                                    render: (u) => <AdminStatusBadge status={u.status} />,
                                },
                                { key: "email", header: "Email", render: (u) => u.email },
                                {
                                    key: "cadastro",
                                    header: "Cadastro",
                                    render: (u) => formatarData(u.criadoEm),
                                },
                                {
                                    key: "plano",
                                    header: "Plano",
                                    render: (u) => (
                                        <div className="flex flex-col gap-0.5">
                                            <span className="font-gabarito-medium text-sm text-azul-900">
                                                {u.plano?.nome ?? "Gratuito"}
                                            </span>
                                            <Link
                                                href={`/admin/assinaturas?nick=${encodeURIComponent(u.nick)}`}
                                                className="font-gabarito-regular text-xs text-azul-600 hover:underline"
                                            >
                                                Gerenciar em Assinaturas
                                            </Link>
                                        </div>
                                    ),
                                },
                                {
                                    key: "tipo",
                                    header: "Tipo Usuário",
                                    render: (u) => (u.isAdmin ? "Administrador" : "Leitor"),
                                },
                                {
                                    key: "acao",
                                    header: "Ação",
                                    render: (u) => (
                                        <AdminAcoes
                                            onEditar={() => abrirEditar(u)}
                                            onApagar={() => apagar(u)}
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

            <UsuarioFormModal
                open={modalAberto}
                usuario={usuarioEditando}
                onClose={() => setModalAberto(false)}
                onSalvo={carregar}
            />
        </>
    );
}
