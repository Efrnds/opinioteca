"use client";

import type { AvaliacaoFeed } from "@/types/avaliacao";
import { ArrowBigDown, ArrowBigUp } from "lucide-react";
import Image from "next/image";
import Box from "./Box";

function tempoRelativo(dataISO: string) {
    const diff = Date.now() - new Date(dataISO).getTime();
    const minutos = Math.floor(diff / 60000);

    if (minutos < 1) return "agora";
    if (minutos < 60) return `${minutos}min`;
    const horas = Math.floor(minutos / 60);
    if (horas < 24) return `${horas}h`;
    const dias = Math.floor(horas / 24);
    if (dias < 7) return `${dias}d`;
    return new Date(dataISO).toLocaleDateString("pt-BR");
}

type PostCardProps = {
    post: AvaliacaoFeed;
};

export default function PostCard({ post }: PostCardProps) {
    const { usuario, livro } = post;
    const inicial = usuario.nome?.charAt(0).toUpperCase() || usuario.nick?.charAt(0).toUpperCase() || "?";

    return (
        <Box className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    {usuario.image ? (
                        <Image
                            src={usuario.image}
                            alt={usuario.nome}
                            width={44}
                            height={44}
                            className="h-11 w-11 shrink-0 rounded-full object-cover"
                        />
                    ) : (
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-200 font-gabarito-bold text-lg text-azul-900">
                            {inicial}
                        </div>
                    )}
                    <div className="min-w-0">
                        <p className="truncate font-gabarito-bold text-lg text-azul-900">{usuario.nome}</p>
                        <p className="truncate font-gabarito-regular text-sm text-cinza-700">@{usuario.nick}</p>
                    </div>
                </div>
                <span className="shrink-0 font-gabarito-regular text-sm text-cinza-700">
                    {tempoRelativo(post.criado_em)}
                </span>
            </div>

            <div className="flex gap-3 rounded-2xl bg-background p-3">
                {livro.capa_url ? (
                    <Image
                        src={livro.capa_url}
                        alt={livro.titulo}
                        width={56}
                        height={84}
                        className="h-[84px] w-14 shrink-0 rounded-lg object-cover"
                        unoptimized
                    />
                ) : (
                    <div className="flex h-[84px] w-14 shrink-0 items-center justify-center rounded-lg bg-azul-200 font-gabarito-bold text-azul-900">
                        📖
                    </div>
                )}
                <div className="min-w-0">
                    <p className="truncate font-gabarito-bold text-base text-azul-900">{livro.titulo}</p>
                    <p className="truncate font-gabarito-regular text-sm text-cinza-700">{livro.autor}</p>
                    <p className="mt-1 font-gabarito-bold text-azul-600">{"★".repeat(post.nota)}{"☆".repeat(5 - post.nota)}</p>
                </div>
            </div>

            <p className="whitespace-pre-wrap font-gabarito-regular text-base text-azul-900 leading-relaxed">{post.texto}</p>

            <div className="flex items-center gap-4 text-cinza-700">
                <div className="flex items-center gap-1">
                    <ArrowBigUp className={`h-5 w-5 ${post.meu_voto === "upvote" ? "text-azul-600" : ""}`} />
                    <span className="font-gabarito-bold text-sm">{post.votos.upvotes}</span>
                </div>
                <div className="flex items-center gap-1">
                    <ArrowBigDown className={`h-5 w-5 ${post.meu_voto === "downvote" ? "text-red-600" : ""}`} />
                    <span className="font-gabarito-bold text-sm">{post.votos.downvotes}</span>
                </div>
            </div>
        </Box>
    );
}
