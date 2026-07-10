"use client";

import Box from "@/app/components/Box";
import AdminPageHeader, {
    AdminAcoes,
    AdminNovoButton,
    AdminStatusBadge,
} from "@/app/components/admin/AdminPageHeader";
import AdminPaginacao from "@/app/components/admin/AdminPaginacao";
import AdminTable from "@/app/components/admin/AdminTable";
import LivroFormModal from "@/app/components/admin/LivroFormModal";
import { ADMIN_PAGE_SIZE, paramsPaginacao, parseListaPaginada } from "@/lib/admin/paginacao";
import type { CategoriaAdmin, LivroAdmin } from "@/types/admin";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export default function AdminLivrosPage() {
    const [livros, setLivros] = useState<LivroAdmin[]>([]);
    const [categorias, setCategorias] = useState<CategoriaAdmin[]>([]);
    const [pagina, setPagina] = useState(1);
    const [total, setTotal] = useState(0);
    const [limite, setLimite] = useState(ADMIN_PAGE_SIZE);
    const [carregando, setCarregando] = useState(true);
    const [modalAberto, setModalAberto] = useState(false);
    const [livroEditando, setLivroEditando] = useState<LivroAdmin | null>(null);
    const [filtro, setFiltro] = useState("");
    const [filtroDebounced, setFiltroDebounced] = useState("");

    useEffect(() => {
        const timer = setTimeout(() => {
            setFiltroDebounced(filtro);
            setPagina(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [filtro]);

    const carregar = useCallback(async () => {
        setCarregando(true);
        try {
            const params = paramsPaginacao(pagina);
            if (filtroDebounced) params.set("q", filtroDebounced);
            const [resLivros, resCategorias] = await Promise.all([
                fetch(`/api/admin/livros?${params}`),
                fetch("/api/admin/categorias"),
            ]);
            if (resLivros.ok) {
                const data = parseListaPaginada<LivroAdmin>(await resLivros.json());
                setLivros(data.itens);
                setTotal(data.total);
                setLimite(data.limite);
            }
            if (resCategorias.ok) {
                const data = await resCategorias.json();
                setCategorias(Array.isArray(data) ? data : parseListaPaginada<CategoriaAdmin>(data).itens);
            }
        } finally {
            setCarregando(false);
        }
    }, [filtroDebounced, pagina]);

    useEffect(() => {
        carregar();
    }, [carregar]);

    function abrirNovo() {
        setLivroEditando(null);
        setModalAberto(true);
    }

    function abrirEditar(livro: LivroAdmin) {
        setLivroEditando(livro);
        setModalAberto(true);
    }

    async function apagar(livro: LivroAdmin) {
        if (!confirm(`Inativar o livro "${livro.titulo}"?`)) return;
        const res = await fetch(`/api/admin/livros/${livro.id}`, { method: "DELETE" });
        if (res.ok) carregar();
    }

    const mapaCategorias = Object.fromEntries(categorias.map((c) => [c.id, c.nome_categoria]));

    return (
        <>
            <AdminPageHeader
                titulo="Livros"
                acao={<AdminNovoButton label="Novo Livro" onClick={abrirNovo} />}
            />

            <div className="mb-4">
                <input
                    type="search"
                    value={filtro}
                    onChange={(e) => setFiltro(e.target.value)}
                    placeholder="Buscar por título, autor, ISBN..."
                    className="w-full max-w-md rounded-xl border border-cinza-200 bg-white px-4 py-2.5 font-gabarito-regular text-sm outline-none focus:border-azul-600"
                />
            </div>

            <Box className="overflow-hidden p-0">
                {carregando ? (
                    <div className="flex justify-center py-16">
                        <Loader2 className="h-8 w-8 animate-spin text-azul-600" />
                    </div>
                ) : (
                    <>
                        <AdminTable
                            data={livros}
                            keyExtractor={(l) => l.id}
                            columns={[
                                { key: "titulo", header: "Título", render: (l) => l.titulo },
                                { key: "autor", header: "Autor", render: (l) => l.autor },
                                { key: "editora", header: "Editora", render: (l) => l.editora || "-" },
                                {
                                    key: "categoria",
                                    header: "Categorias",
                                    render: (l) => {
                                        const ids =
                                            l.categorias_ids && l.categorias_ids.length > 0
                                                ? l.categorias_ids
                                                : l.categoria_id
                                                  ? [l.categoria_id]
                                                  : [];
                                        return ids.map((id) => mapaCategorias[id] ?? id).join(", ") || "-";
                                    },
                                },
                                {
                                    key: "status",
                                    header: "Status",
                                    render: (l) => <AdminStatusBadge status={l.status} />,
                                },
                                { key: "origem", header: "Origem", render: (l) => l.origem },
                                {
                                    key: "acao",
                                    header: "Ação",
                                    render: (l) => (
                                        <AdminAcoes
                                            onEditar={() => abrirEditar(l)}
                                            onApagar={() => apagar(l)}
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

            <LivroFormModal
                open={modalAberto}
                livro={livroEditando}
                categorias={categorias}
                onClose={() => setModalAberto(false)}
                onSalvo={carregar}
            />
        </>
    );
}
