"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CreditCard, FileBarChart, FileText, Flag, Tags, Users } from "lucide-react";
import { useEffect, useState, type ComponentType } from "react";

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
    const active = pathname.startsWith(href);

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

export default function AdminSidebar() {
    const pathname = usePathname();
    const [pendentesDenuncias, setPendentesDenuncias] = useState(0);

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

    return (
        <aside className="flex w-72 shrink-0 flex-col bg-azul-900 px-4 py-6 text-white">
            <h1 className="mb-8 px-2 font-gabarito-bold text-lg leading-tight">Painel Administrativo</h1>

            <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
                <NavItem href="/admin/livros" label="Livros" icon={BookOpen} />
                <NavItem href="/admin/usuarios" label="Usuários" icon={Users} />
                <NavItem href="/admin/assinaturas" label="Assinaturas" icon={CreditCard} />
                <NavItem href="/admin/templates" label="Templates" icon={FileText} />
                <NavItem href="/admin/categorias" label="Categorias" icon={Tags} />
                <NavItem href="/admin/denuncias" label="Denúncias" icon={Flag} badge={pendentesDenuncias} />
                <NavItem href="/admin/relatorios" label="Relatórios" icon={FileBarChart} />
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
