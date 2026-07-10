"use client";

import {
    forcarTemaClaroAdmin,
    restaurarTemaUsuarioNoDocumento,
} from "@/lib/tema";
import { useEffect } from "react";
import AdminSidebar from "./AdminSidebar";

export default function AdminShell({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        forcarTemaClaroAdmin();
        return () => {
            restaurarTemaUsuarioNoDocumento();
        };
    }, []);

    return (
        <div
            data-admin
            className="flex h-screen w-screen overflow-hidden bg-background text-foreground"
        >
            <AdminSidebar />
            <main className="min-w-0 flex-1 overflow-y-auto p-6 md:p-8">{children}</main>
        </div>
    );
}
