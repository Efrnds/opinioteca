"use client";
import RelatorioConsultaModal from "@/app/components/admin/RelatorioConsultaModal";
import { type RelatorioSlug } from "@/lib/admin/relatorios";
import {
    BookOpen,
    ChevronDown,
    ChevronRight,
    CreditCard,
    FileBarChart,
    FileText,
    Flag,
    Tags,
    Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ComponentType, type ReactNode } from "react";

function NavItem({
    href,
    label,
    icon: Icon,
    badge,
}: {
    href: string;
    label: string;
    icon: ComponentType<{ className?: string }>;
    badge?: number;
}) {
    const pathname = usePathname();
    const active = pathname === href || pathname.startsWith(`${href}/`);
    return (
        <Link
            href={href}
            className={`flex items-center justify-between gap-3 rounded-xl px-4 py-2.5 font-gabarito-medium text-sm transition ${
                active ? "bg-azul-600 text-white" : "text-white/80 hover:bg-white/10 hover:text-white"
            }`}
        >
            <span className="flex items-center gap-3">
                <Icon className="h-4 w-4 shrink-0" />
                {label}
            </span>
            {badge != null && badge > 0 && (
                <span className="rounded-full bg-amber-500 px-2 py-0.5 font-gabarito-bold text-xs text-white">
                    {badge}
                </span>
            )}
        </Link>
    );
}

function RelatorioGrupo({
    titulo,
    aberto,
    onToggle,
    children,
}: {
    titulo: string;
    aberto: boolean;
    onToggle: () => void;
    children: ReactNode;
}) {
    return (
        <div className="border-b border-white/15 last:border-b-0">
            <button
                type="button"
                onClick={onToggle}
                className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left font-gabarito-medium text-sm text-white/90 transition hover:text-white"
            >
                <span>{titulo}</span>
                {aberto ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
            </button>
            {aberto && <div className="flex flex-col gap-1 pb-2 pl-2">{children}</div>}
        </div>
    );
}

function RelatorioItem({
    label,
    ativo,
    onClick,
}: {
    label: string;
    ativo?: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`w-full rounded-lg px-3 py-2 text-left font-gabarito-medium text-sm transition ${
                ativo ? "bg-azul-500 text-white" : "text-white/80 hover:bg-white/10 hover:text-white"
            }`}
        >
            {label}
        </button>
    );
}

export default function AdminSidebar() {
    const pathname = usePathname();
    const [pendentesDenuncias, setPendentesDenuncias] = useState(0);
    const [relatoriosAberto, setRelatoriosAberto] = useState(pathname.startsWith("/admin/relatorios"));
    const [comentariosAberto, setComentariosAberto] = useState(false);
    const [livrosAberto, setLivrosAberto] = useState(false);
    const [modalSlug, setModalSlug] = useState<RelatorioSlug | null>(null);

    useEffect(() => {
        fetch("/api/admin/denuncias?status=pendente")
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (data && typeof data.pendentes === "number") {
                    setPendentesDenuncias(data.pendentes);
                }
            })
            .catch(() => {});
    }, [pathname]);

    useEffect(() => {
        if (pathname.startsWith("/admin/relatorios")) {
            setRelatoriosAberto(true);
            if (pathname.includes("comentarios-")) setComentariosAberto(true);
            if (pathname.includes("livros-")) setLivrosAberto(true);
        }
    }, [pathname]);

    function abrirRelatorio(slug: RelatorioSlug) {
        setModalSlug(slug);
    }

    const slugAtivo = pathname.startsWith("/admin/relatorios/")
        ? (pathname.split("/")[3] as RelatorioSlug | undefined)
        : undefined;

    return (
        <>
            <aside className="flex w-72 shrink-0 flex-col bg-azul-900 px-4 py-6 text-white">
                <h1 className="mb-8 px-2 font-gabarito-bold text-lg leading-tight">Painel Administrativo</h1>

                <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
                    <NavItem href="/admin/livros" label="Livros" icon={BookOpen} />
                    <NavItem href="/admin/usuarios" label="Usuários" icon={Users} />
                    <NavItem href="/admin/assinaturas" label="Assinaturas" icon={CreditCard} />
                    <NavItem href="/admin/templates" label="Templates" icon={FileText} />
                    <NavItem href="/admin/categorias" label="Categorias" icon={Tags} />
                    <NavItem href="/admin/denuncias" label="Denúncias" icon={Flag} badge={pendentesDenuncias} />

                    <div className="mt-1">
                        <button
                            type="button"
                            onClick={() => setRelatoriosAberto((v) => !v)}
                            className={`flex w-full items-center justify-between gap-3 rounded-xl px-4 py-2.5 font-gabarito-medium text-sm transition ${
                                relatoriosAberto || pathname.startsWith("/admin/relatorios")
                                    ? "bg-azul-700 text-white"
                                    : "text-white/80 hover:bg-white/10 hover:text-white"
                            }`}
                        >
                            <span className="flex items-center gap-3">
                                <FileBarChart className="h-4 w-4 shrink-0" />
                                Relatórios
                            </span>
                            {relatoriosAberto ? (
                                <ChevronDown className="h-4 w-4 shrink-0" />
                            ) : (
                                <ChevronRight className="h-4 w-4 shrink-0" />
                            )}
                        </button>

                        {relatoriosAberto && (
                            <div className="mt-1 rounded-xl bg-azul-800/80 px-2 py-1">
                                <RelatorioGrupo
                                    titulo="Comentários por"
                                    aberto={comentariosAberto}
                                    onToggle={() => setComentariosAberto((v) => !v)}
                                >
                                    <RelatorioItem
                                        label="Livro"
                                        ativo={slugAtivo === "comentarios-livro" || modalSlug === "comentarios-livro"}
                                        onClick={() => abrirRelatorio("comentarios-livro")}
                                    />
                                    <RelatorioItem
                                        label="Usuário"
                                        ativo={slugAtivo === "comentarios-usuario" || modalSlug === "comentarios-usuario"}
                                        onClick={() => abrirRelatorio("comentarios-usuario")}
                                    />
                                    <RelatorioItem
                                        label="Categoria"
                                        ativo={slugAtivo === "comentarios-categoria" || modalSlug === "comentarios-categoria"}
                                        onClick={() => abrirRelatorio("comentarios-categoria")}
                                    />
                                </RelatorioGrupo>

                                <RelatorioGrupo
                                    titulo="Listagem de livro por"
                                    aberto={livrosAberto}
                                    onToggle={() => setLivrosAberto((v) => !v)}
                                >
                                    <RelatorioItem
                                        label="Autor"
                                        ativo={slugAtivo === "livros-autor" || modalSlug === "livros-autor"}
                                        onClick={() => abrirRelatorio("livros-autor")}
                                    />
                                    <RelatorioItem
                                        label="Editora"
                                        ativo={slugAtivo === "livros-editora" || modalSlug === "livros-editora"}
                                        onClick={() => abrirRelatorio("livros-editora")}
                                    />
                                    <RelatorioItem
                                        label="Categoria"
                                        ativo={slugAtivo === "livros-categoria" || modalSlug === "livros-categoria"}
                                        onClick={() => abrirRelatorio("livros-categoria")}
                                    />
                                </RelatorioGrupo>

                                <div className="flex flex-col gap-1 border-b border-white/15 py-1">
                                    <RelatorioItem
                                        label="Listagem de Seguidores e Seguindo do Leitor"
                                        ativo={
                                            slugAtivo === "seguidores-seguindo" || modalSlug === "seguidores-seguindo"
                                        }
                                        onClick={() => abrirRelatorio("seguidores-seguindo")}
                                    />
                                </div>

                                <div className="flex flex-col gap-1 py-1">
                                    <RelatorioItem
                                        label="Histórico de Leitura do Leitor"
                                        ativo={slugAtivo === "historico-leitura" || modalSlug === "historico-leitura"}
                                        onClick={() => abrirRelatorio("historico-leitura")}
                                    />
                                </div>

                                <div className="mt-1 border-t border-white/15 pt-1">
                                    <Link
                                        href="/admin/relatorios"
                                        className={`block rounded-lg px-3 py-2 font-gabarito-medium text-sm transition ${
                                            pathname === "/admin/relatorios"
                                                ? "bg-azul-500 text-white"
                                                : "text-white/70 hover:bg-white/10 hover:text-white"
                                        }`}
                                    >
                                        PDFs gerais
                                    </Link>
                                </div>
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

            <RelatorioConsultaModal
                slug={modalSlug}
                open={modalSlug != null}
                onClose={() => setModalSlug(null)}
            />
        </>
    );
}
