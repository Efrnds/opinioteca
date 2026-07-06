"use client";

import Box from "@/app/components/Box";
import AdminPageHeader, {
    AdminAcoes,
    AdminNovoButton,
    AdminStatusBadge,
} from "@/app/components/admin/AdminPageHeader";
import AdminTable from "@/app/components/admin/AdminTable";
import UsuarioFormModal from "@/app/components/admin/UsuarioFormModal";
import type { UsuarioAdmin } from "@/types/admin";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

function formatarData(iso: string) {
    return new Date(iso).toLocaleDateString("pt-BR");
}

export default function AdminUsuariosPage() {
    const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [modalAberto, setModalAberto] = useState(false);
    const [usuarioEditando, setUsuarioEditando] = useState<UsuarioAdmin | null>(null);

    const carregar = useCallback(async () => {
        setCarregando(true);
        try {
            const res = await fetch("/api/admin/usuarios");
            if (res.ok) {
                const data = await res.json();
                setUsuarios(Array.isArray(data) ? data : []);
            }
        } finally {
            setCarregando(false);
        }
    }, []);

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

            <Box className="p-0 overflow-hidden">
                {carregando ? (
                    <div className="flex justify-center py-16">
                        <Loader2 className="h-8 w-8 animate-spin text-azul-600" />
                    </div>
                ) : (
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
