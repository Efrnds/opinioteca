"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, ChevronDown, Tags, Users } from "lucide-react";
import { useState } from "react";
import { useAdminReport } from "./AdminShell";
import { RELATORIOS, type RelatorioSlug } from "@/lib/admin/relatorios";

function NavLink({
    href,
    label,
    active,
}: {
    href: string;
    label: string;
    active: boolean;
}) {
    return (
        <Link
            href={href}
            className={`block rounded-xl px-4 py-2.5 font-gabarito-medium text-sm transition ${
                active ? "bg-azul-600 text-white" : "text-white/80 hover:bg-white/10 hover:text-white"
            }`}
        >
            {label}
        </Link>
    );
}

function ReportButton({ slug, label }: { slug: RelatorioSlug; label: string }) {
    const { abrirRelatorio } = useAdminReport();

    return (
        <button
            type="button"
            onClick={() => abrirRelatorio(slug)}
            className="block w-full rounded-lg px-3 py-2 text-left font-gabarito-regular text-sm text-white/75 transition hover:bg-white/10 hover:text-white"
        >
            {label}
        </button>
    );
}

export default function AdminSidebar() {
    const pathname = usePathname();
    const [relatoriosAberto, setRelatoriosAberto] = useState(true);

    return (
        <aside className="flex w-72 shrink-0 flex-col bg-azul-900 px-4 py-6 text-white">
            <h1 className="mb-8 px-2 font-gabarito-bold text-lg leading-tight">Painel Administrativo</h1>

            <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
                <Link
                    href="/admin/livros"
                    className={`flex items-center gap-3 rounded-xl px-4 py-2.5 font-gabarito-medium text-sm transition ${
                        pathname.startsWith("/admin/livros")
                            ? "bg-azul-600 text-white"
                            : "text-white/80 hover:bg-white/10 hover:text-white"
                    }`}
                >
                    <BookOpen className="h-4 w-4 shrink-0" />
                    Livros
                </Link>

                <Link
                    href="/admin/usuarios"
                    className={`flex items-center gap-3 rounded-xl px-4 py-2.5 font-gabarito-medium text-sm transition ${
                        pathname.startsWith("/admin/usuarios")
                            ? "bg-azul-600 text-white"
                            : "text-white/80 hover:bg-white/10 hover:text-white"
                    }`}
                >
                    <Users className="h-4 w-4 shrink-0" />
                    Usuários
                </Link>

                <Link
                    href="/admin/categorias"
                    className={`flex items-center gap-3 rounded-xl px-4 py-2.5 font-gabarito-medium text-sm transition ${
                        pathname.startsWith("/admin/categorias")
                            ? "bg-azul-600 text-white"
                            : "text-white/80 hover:bg-white/10 hover:text-white"
                    }`}
                >
                    <Tags className="h-4 w-4 shrink-0" />
                    Categorias
                </Link>

                <div className="mt-2">
                    <button
                        type="button"
                        onClick={() => setRelatoriosAberto((v) => !v)}
                        className="flex w-full items-center justify-between rounded-xl px-4 py-2.5 font-gabarito-medium text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
                    >
                        Relatórios
                        <ChevronDown
                            className={`h-4 w-4 transition ${relatoriosAberto ? "rotate-180" : ""}`}
                        />
                    </button>

                    {relatoriosAberto && (
                        <div className="mt-2 flex flex-col gap-3 px-1">
                            <div className="rounded-xl bg-white/5 p-3">
                                <p className="mb-2 px-2 font-gabarito-medium text-xs text-white/50">
                                    Comentários por
                                </p>
                                <ReportButton slug="comentarios-livro" label="Livro" />
                                <ReportButton slug="comentarios-usuario" label="Usuário" />
                                <ReportButton slug="comentarios-categoria" label="Categoria" />
                            </div>

                            <div className="rounded-xl bg-white/5 p-3">
                                <p className="mb-2 px-2 font-gabarito-medium text-xs text-white/50">
                                    Listagem de livro por
                                </p>
                                <ReportButton slug="livros-autor" label="Autor" />
                                <ReportButton slug="livros-editora" label="Editora" />
                                <ReportButton slug="livros-categoria" label="Categoria" />
                            </div>

                            <ReportButton
                                slug="seguidores-seguindo"
                                label="Listagem de Seguidores e Seguindo do Leitor"
                            />
                            <ReportButton slug="historico-leitura" label="Histórico de Leitura do Leitor" />
                        </div>
                    )}
                </div>
            </nav>

            <Link
                href="/home"
                className="mt-4 block rounded-xl px-4 py-2 text-center font-gabarito-regular text-sm text-white/60 transition hover:text-white"
            >
                Voltar ao app
            </Link>
        </aside>
    );
}
