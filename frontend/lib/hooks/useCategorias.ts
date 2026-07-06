"use client";

import type { CategoriaLivro } from "@/lib/livro-cadastro";
import { useEffect, useState } from "react";

export function useCategoriasLivro(ativo: boolean) {
    const [categorias, setCategorias] = useState<CategoriaLivro[]>([]);
    const [carregando, setCarregando] = useState(false);

    useEffect(() => {
        if (!ativo) return;

        let cancelado = false;
        setCarregando(true);

        fetch("/api/categorias")
            .then(async (res) => {
                if (!res.ok) return [];
                const data = await res.json();
                return Array.isArray(data) ? data : [];
            })
            .then((lista) => {
                if (!cancelado) setCategorias(lista);
            })
            .finally(() => {
                if (!cancelado) setCarregando(false);
            });

        return () => {
            cancelado = true;
        };
    }, [ativo]);

    return { categorias, carregando };
}
