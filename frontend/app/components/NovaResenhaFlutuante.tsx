"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import NovaAvaliacaoModal from "./NovaAvaliacaoModal";

export default function NovaResenhaFlutuante() {
    const [modalAberto, setModalAberto] = useState(false);

    return (
        <>
            <button
                type="button"
                onClick={() => setModalAberto(true)}
                aria-label="Nova Resenha"
                className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-3 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-azul-600 text-white shadow-lg transition hover:bg-azul-700 active:scale-95 lg:hidden"
            >
                <Plus className="h-6 w-6" />
            </button>

            <NovaAvaliacaoModal open={modalAberto} onClose={() => setModalAberto(false)} />
        </>
    );
}
