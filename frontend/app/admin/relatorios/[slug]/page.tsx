"use client";

import Box from "@/app/components/Box";
import AdminPageHeader, { AdminStatusBadge } from "@/app/components/admin/AdminPageHeader";
import AdminTable from "@/app/components/admin/AdminTable";
import { RELATORIOS, type RelatorioSlug } from "@/lib/admin/relatorios";
import type {
    ComentarioRelatorio,
    HistoricoLeituraRelatorio,
    LivroAdmin,
    SeguidoresSeguindoRelatorio,
    UsuarioRelatorioResumo,
} from "@/types/admin";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

function formatarData(iso: string) {
    return new Date(iso).toLocaleString("pt-BR");
}

function truncar(texto: string, max = 80) {
    return texto.length > max ? `${texto.slice(0, max)}…` : texto;
}

async function buscarRelatorio(slug: RelatorioSlug, q: string) {
    const config = RELATORIOS[slug];

    if (config.apiCategoria === "comentarios") {
        const res = await fetch(
            `/api/admin/relatorios/comentarios?tipo=${config.apiTipo}&q=${encodeURIComponent(q)}`,
        );
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).erro ?? "Erro ao carregar relatório");
        return res.json() as Promise<ComentarioRelatorio[]>;
    }

    if (config.apiCategoria === "livros") {
        const res = await fetch(
            `/api/admin/relatorios/livros?tipo=${config.apiTipo}&q=${encodeURIComponent(q)}`,
        );
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).erro ?? "Erro ao carregar relatório");
        return res.json() as Promise<LivroAdmin[]>;
    }

    if (config.apiCategoria === "seguidores-seguindo") {
        const res = await fetch(
            `/api/admin/relatorios/seguidores-seguindo?q=${encodeURIComponent(q)}`,
        );
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).erro ?? "Erro ao carregar relatório");
        return res.json() as Promise<SeguidoresSeguindoRelatorio>;
    }

    const res = await fetch(`/api/admin/relatorios/historico-leitura?q=${encodeURIComponent(q)}`);
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).erro ?? "Erro ao carregar relatório");
    return res.json() as Promise<HistoricoLeituraRelatorio>;
}

function TabelaUsuarios({ titulo, usuarios }: { titulo: string; usuarios: UsuarioRelatorioResumo[] }) {
    return (
        <div>
            <h3 className="mb-3 font-gabarito-bold text-lg text-azul-900">{titulo}</h3>
            <Box className="overflow-hidden p-0">
                <AdminTable
                    data={usuarios}
                    keyExtractor={(u) => u.id}
                    emptyMessage="Nenhum usuário encontrado."
                    columns={[
                        { key: "nome", header: "Nome", render: (u) => u.nome },
                        { key: "nick", header: "Nick", render: (u) => `@${u.nick}` },
                        { key: "email", header: "E-mail", render: (u) => u.email || "—" },
                    ]}
                />
            </Box>
        </div>
    );
}

export default function AdminRelatorioPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const slug = params.slug as RelatorioSlug;
    const q = searchParams.get("q") ?? "";

    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState("");
    const [dados, setDados] = useState<unknown>(null);

    const config = RELATORIOS[slug];

    useEffect(() => {
        if (!config || !q) {
            setCarregando(false);
            return;
        }

        setCarregando(true);
        setErro("");
        buscarRelatorio(slug, q)
            .then(setDados)
            .catch((e) => setErro(e instanceof Error ? e.message : "Erro ao carregar"))
            .finally(() => setCarregando(false));
    }, [slug, q, config]);

    if (!config) {
        return <p className="font-gabarito-regular text-cinza-700">Relatório não encontrado.</p>;
    }

    return (
        <>
            <Link
                href="/admin/usuarios"
                className="mb-4 inline-flex items-center gap-2 font-gabarito-medium text-sm text-azul-600 hover:underline"
            >
                <ArrowLeft className="h-4 w-4" />
                Voltar
            </Link>

            <AdminPageHeader titulo={config.titulo} />

            <p className="mb-6 font-gabarito-regular text-sm text-cinza-700">
                Resultados para: <strong>{q}</strong>
            </p>

            {carregando && (
                <div className="flex justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-azul-600" />
                </div>
            )}

            {erro && <p className="text-red-500">{erro}</p>}

            {!carregando && !erro && dados && slug.startsWith("comentarios-") && (
                <Box className="overflow-hidden p-0">
                    <AdminTable
                        data={dados as ComentarioRelatorio[]}
                        keyExtractor={(c) => c.id}
                        columns={[
                            { key: "texto", header: "Comentário", render: (c) => truncar(c.texto) },
                            { key: "autor", header: "Autor", render: (c) => `@${c.usuario_nick}` },
                            { key: "livro", header: "Livro", render: (c) => c.livro_titulo },
                            { key: "categoria", header: "Categoria", render: (c) => c.categoria_nome },
                            { key: "data", header: "Data", render: (c) => formatarData(c.criadoEm) },
                        ]}
                    />
                </Box>
            )}

            {!carregando && !erro && dados && slug.startsWith("livros-") && (
                <Box className="overflow-hidden p-0">
                    <AdminTable
                        data={dados as LivroAdmin[]}
                        keyExtractor={(l) => l.id}
                        columns={[
                            { key: "titulo", header: "Título", render: (l) => l.titulo },
                            { key: "autor", header: "Autor", render: (l) => l.autor },
                            { key: "editora", header: "Editora", render: (l) => l.editora || "—" },
                            {
                                key: "status",
                                header: "Status",
                                render: (l) => <AdminStatusBadge status={l.status} />,
                            },
                        ]}
                    />
                </Box>
            )}

            {!carregando && !erro && dados && slug === "seguidores-seguindo" && (
                <div className="flex flex-col gap-8">
                    <p className="font-gabarito-medium text-azul-900">
                        Leitor: {(dados as SeguidoresSeguindoRelatorio).usuario.nome} (@
                        {(dados as SeguidoresSeguindoRelatorio).usuario.nick})
                    </p>
                    <div className="grid gap-8 lg:grid-cols-2">
                        <TabelaUsuarios
                            titulo="Seguidores"
                            usuarios={(dados as SeguidoresSeguindoRelatorio).seguidores}
                        />
                        <TabelaUsuarios
                            titulo="Seguindo"
                            usuarios={(dados as SeguidoresSeguindoRelatorio).seguindo}
                        />
                    </div>
                </div>
            )}

            {!carregando && !erro && dados && slug === "historico-leitura" && (
                <div>
                    <p className="mb-4 font-gabarito-medium text-azul-900">
                        Leitor: {(dados as HistoricoLeituraRelatorio).usuario.nome} (@
                        {(dados as HistoricoLeituraRelatorio).usuario.nick})
                    </p>
                    <Box className="overflow-hidden p-0">
                        <AdminTable
                            data={(dados as HistoricoLeituraRelatorio).historico}
                            keyExtractor={(h) => h.id}
                            columns={[
                                { key: "livro", header: "Livro", render: (h) => h.livro.titulo },
                                { key: "autor", header: "Autor", render: (h) => h.livro.autor },
                                { key: "paginas", header: "Páginas", render: (h) => h.paginas_lidas },
                                {
                                    key: "porcentagem",
                                    header: "%",
                                    render: (h) => `${h.porcentagem_leitura.toFixed(1)}%`,
                                },
                                {
                                    key: "data",
                                    header: "Data",
                                    render: (h) => formatarData(h.data_registro),
                                },
                            ]}
                        />
                    </Box>
                </div>
            )}
        </>
    );
}
