"use client";

import { createContext, useCallback, useContext, useState } from "react";
import AdminSidebar from "./AdminSidebar";
import AdminRelatorioModal from "./AdminRelatorioModal";
import { RELATORIOS, type RelatorioSlug } from "@/lib/admin/relatorios";

type AdminReportContextValue = {
    abrirRelatorio: (slug: RelatorioSlug) => void;
};

const AdminReportContext = createContext<AdminReportContextValue | null>(null);

export function useAdminReport() {
    const ctx = useContext(AdminReportContext);
    if (!ctx) throw new Error("useAdminReport deve ser usado dentro de AdminShell");
    return ctx;
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
    const [relatorioAberto, setRelatorioAberto] = useState<RelatorioSlug | null>(null);

    const abrirRelatorio = useCallback((slug: RelatorioSlug) => {
        setRelatorioAberto(slug);
    }, []);

    const config = relatorioAberto ? RELATORIOS[relatorioAberto] : null;

    return (
        <AdminReportContext.Provider value={{ abrirRelatorio }}>
            <div className="flex h-screen w-screen overflow-hidden bg-background">
                <AdminSidebar />
                <main className="min-w-0 flex-1 overflow-y-auto p-6 md:p-8">{children}</main>
            </div>

            {config && relatorioAberto && (
                <AdminRelatorioModal
                    open
                    slug={relatorioAberto}
                    titulo={config.titulo}
                    subtitulo={config.subtitulo}
                    placeholder={config.placeholder}
                    onClose={() => setRelatorioAberto(null)}
                />
            )}
        </AdminReportContext.Provider>
    );
}
