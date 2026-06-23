"use client";

import type { LivroBusca } from "@/types/livro";
import { BookOpen, ChevronLeft, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Box from "../../../components/Box";

export default function LivroGooglePage() {
    const params = useParams<{ volumeId: string }>();
    const router = useRouter();
    const volumeId = params?.volumeId ?? "";

    const [livro, setLivro] = useState<LivroBusca | null>(null);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState("");

    useEffect(() => {
        async function carregar() {
            if (!volumeId) {
                setErro("Volume inválido.");
                setCarregando(false);
                return;
            }

            try {
                const res = await fetch(`/api/livros/buscar?q=${encodeURIComponent(volumeId)}`);
                const data = await res.json();
                if (!res.ok) {
                    setErro(data.erro || "Livro não encontrado.");
                    return;
                }
                const encontrado =
                    (data.resultados as LivroBusca[] | undefined)?.find(
                        (item) => item.google_volume_id === volumeId,
                    ) ??
                    (data.resultados as LivroBusca[] | undefined)?.find((item) => item.id);
                if (encontrado) {
                    if (encontrado.id) {
                        router.replace(`/livros/${encontrado.id}`);
                        return;
                    }
                    setLivro(encontrado);
                } else {
                    setErro("Livro não encontrado no catálogo.");
                }
            } catch {
                setErro("Não foi possível carregar o livro.");
            } finally {
                setCarregando(false);
            }
        }

        carregar();
    }, [volumeId, router]);

    if (carregando) {
        return (
            <Box className="flex items-center justify-center gap-2 p-12">
                <Loader2 className="h-6 w-6 animate-spin text-azul-600" />
            </Box>
        );
    }

    if (erro || !livro) {
        return (
            <Box className="p-8 text-center">
                <p className="font-gabarito-bold text-red-600">{erro || "Livro não encontrado."}</p>
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="mt-4 font-gabarito-bold text-azul-600 hover:underline"
                >
                    Voltar
                </button>
            </Box>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <button
                type="button"
                onClick={() => router.back()}
                className="flex w-fit items-center gap-1 font-gabarito-bold text-azul-600 hover:underline"
            >
                <ChevronLeft className="h-5 w-5" />
                Voltar
            </button>
            <Box className="flex gap-4 p-4">
                {livro.capa_url ? (
                    <Image
                        src={livro.capa_url}
                        alt={livro.titulo}
                        width={120}
                        height={180}
                        className="h-[180px] w-[120px] rounded-lg object-cover"
                        unoptimized
                    />
                ) : (
                    <div className="flex h-[180px] w-[120px] items-center justify-center rounded-lg bg-azul-100">
                        <BookOpen className="h-10 w-10 text-azul-600" />
                    </div>
                )}
                <div>
                    <h1 className="font-gabarito-bold text-2xl text-azul-900">{livro.titulo}</h1>
                    <p className="mt-1 font-gabarito-regular text-cinza-700">{livro.autor}</p>
                    <p className="mt-3 font-gabarito-regular text-sm text-cinza-700">
                        Livro do Google Books — cadastre uma resenha pela home.
                    </p>
                    <Link
                        href="/home"
                        className="mt-4 inline-block rounded-full bg-azul-600 px-4 py-2 font-gabarito-bold text-sm text-white transition hover:bg-azul-700"
                    >
                        Ir para o feed
                    </Link>
                </div>
            </Box>
        </div>
    );
}
