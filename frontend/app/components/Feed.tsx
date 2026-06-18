"use client";

import type { AvaliacaoFeed } from "@/types/avaliacao";
import { useEffect, useState } from "react";
import PostCard from "./PostCard";

export default function Feed() {
    const [posts, setPosts] = useState<AvaliacaoFeed[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState("");

    useEffect(() => {
        async function carregarFeed() {
            try {
                const res = await fetch("/api/avaliacoes");
                const data = await res.json();

                if (!res.ok) {
                    setErro(data.erro || "Não foi possível carregar o feed.");
                    return;
                }

                if (!Array.isArray(data)) {
                    setErro("Formato inesperado do feed. Verifique se o backend está atualizado.");
                    return;
                }

                setPosts(data);
            } catch {
                setErro("Não foi possível carregar o feed.");
            } finally {
                setCarregando(false);
            }
        }

        carregarFeed();
    }, []);

    if (carregando) {
        return (
            <div className="flex flex-col gap-4">
                {[1, 2, 3].map((item) => (
                    <div key={item} className="h-48 animate-pulse rounded-2xl bg-white/70" />
                ))}
            </div>
        );
    }

    if (erro) {
        return (
            <div className="rounded-2xl bg-white p-6 text-center">
                <p className="font-gabarito-bold text-lg text-red-600">{erro}</p>
            </div>
        );
    }

    if (posts.length === 0) {
        return (
            <div className="rounded-2xl bg-white p-8 text-center">
                <p className="font-gabarito-bold text-2xl text-azul-900">Nenhuma resenha ainda</p>
                <p className="mt-2 font-gabarito-regular text-cinza-700">
                    Seja o primeiro a publicar uma resenha na opinioteca.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            {posts.map((post) => (
                <PostCard key={post.id} post={post} />
            ))}
        </div>
    );
}
