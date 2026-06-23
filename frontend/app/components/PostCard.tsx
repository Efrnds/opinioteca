"use client";

import type { AvaliacaoFeed, ComentarioAvaliacao, ContadoresVoto } from "@/types/avaliacao";
import { ArrowBigDown, ArrowBigUp, Loader2, MessageCircle, MoreHorizontal, Send, Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Box from "./Box";
import { useWebSocket } from "./WebSocketProvider";

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
    podeApagar?: boolean;
    aoApagar?: (avaliacaoId: number) => Promise<void> | void;
};

type VotoResposta = {
    avaliacao?: {
        votos: ContadoresVoto;
        meu_voto?: string;
    };
    votos?: ContadoresVoto;
    meu_voto?: string;
};

type ComentarioNo = ComentarioAvaliacao & {
    respostas: ComentarioNo[];
};

function extrairVotos(data: VotoResposta) {
    if (data.avaliacao) {
        return { votos: data.avaliacao.votos, meuVoto: data.avaliacao.meu_voto };
    }
    return { votos: data.votos!, meuVoto: data.meu_voto };
}

function ordenarComentarios(a: ComentarioNo, b: ComentarioNo) {
    if ((b.votos ?? 0) !== (a.votos ?? 0)) {
        return (b.votos ?? 0) - (a.votos ?? 0);
    }
    return new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime();
}

function montarArvoreComentarios(lista: ComentarioAvaliacao[]) {
    const mapa = new Map<number, ComentarioNo>();
    const raizes: ComentarioNo[] = [];

    for (const comentario of lista) {
        mapa.set(comentario.id, { ...comentario, respostas: [] });
    }

    for (const comentario of lista) {
        const noAtual = mapa.get(comentario.id);
        if (!noAtual) continue;

        if (comentario.pai_id && mapa.has(comentario.pai_id)) {
            mapa.get(comentario.pai_id)!.respostas.push(noAtual);
        } else {
            raizes.push(noAtual);
        }
    }

    const ordenarRecursivo = (nos: ComentarioNo[]) => {
        nos.sort(ordenarComentarios);
        for (const no of nos) {
            ordenarRecursivo(no.respostas);
        }
    };
    ordenarRecursivo(raizes);

    return raizes;
}

export default function PostCard({ post, podeApagar = false, aoApagar }: PostCardProps) {
    const { data: session } = useSession();
    const { subscribe } = useWebSocket();
    const usuario = post?.usuario ?? { id: 0, nome: "Usuário", nick: "desconhecido", image: undefined };
    const livro = post?.livro ?? { id: 0, titulo: "Livro não informado", autor: "Autor não informado", capa_url: undefined };
    const inicial = usuario.nome?.charAt(0).toUpperCase() || usuario.nick?.charAt(0).toUpperCase() || "?";
    const textoPost = post?.texto ?? "";
    const notaPost = Number.isFinite(post?.nota) ? post.nota : 0;

    const [votos, setVotos] = useState(post?.votos ?? { upvotes: 0, downvotes: 0, score: 0 });
    const [meuVoto, setMeuVoto] = useState(post.meu_voto);
    const [votando, setVotando] = useState(false);
    const [erroVoto, setErroVoto] = useState("");
    const [menuAberto, setMenuAberto] = useState(false);
    const [apagando, setApagando] = useState(false);
    const [comentariosAbertos, setComentariosAbertos] = useState(false);
    const [comentariosCarregados, setComentariosCarregados] = useState(false);
    const [comentarios, setComentarios] = useState<ComentarioAvaliacao[]>([]);
    const [carregandoComentarios, setCarregandoComentarios] = useState(false);
    const [novoComentario, setNovoComentario] = useState("");
    const [enviandoComentario, setEnviandoComentario] = useState(false);
    const [comentarioPaiAtivo, setComentarioPaiAtivo] = useState<number | null>(null);
    const [textoResposta, setTextoResposta] = useState("");
    const [enviandoResposta, setEnviandoResposta] = useState(false);
    const [comentarioDestaque, setComentarioDestaque] = useState(post.comentario_destaque);
    const [erroComentario, setErroComentario] = useState("");
    const menuRef = useRef<HTMLDivElement | null>(null);

    const ehProprioPost = session?.user?.id === String(usuario.id);
    const comentariosArvore = useMemo(() => montarArvoreComentarios(comentarios), [comentarios]);

    useEffect(() => {
        setVotos(post.votos);
        setMeuVoto(post.meu_voto);
    }, [post.votos, post.meu_voto]);

    useEffect(() => {
        setComentarioDestaque(post.comentario_destaque);
    }, [post.comentario_destaque]);

    useEffect(() => {
        return subscribe((tipo, payload) => {
            const dados = payload as {
                avaliacao_id: number;
                votos?: typeof votos;
                qtd_comentarios?: number;
                comentario?: ComentarioAvaliacao;
                comentario_destaque?: ComentarioAvaliacao | null;
            };

            if (dados.avaliacao_id !== post.id) return;

            if (tipo === "AVALIACAO_ATUALIZADA" && dados.votos) {
                setVotos(dados.votos);
            }

            if (tipo === "NOVO_COMENTARIO" && dados.comentario) {
                setComentarios((lista) => {
                    if (lista.some((c) => c.id === dados.comentario!.id)) return lista;
                    return [...lista, dados.comentario!];
                });
                setComentariosCarregados(true);
                if (dados.comentario_destaque !== undefined) {
                    setComentarioDestaque(dados.comentario_destaque ?? undefined);
                }
            }

            if (tipo === "COMENTARIO_ATUALIZADO" && dados.comentario) {
                setComentarios((lista) =>
                    lista.map((item) =>
                        item.id === dados.comentario!.id ? { ...item, ...dados.comentario! } : item,
                    ),
                );
                setComentarioDestaque((atual) => {
                    if (dados.comentario_destaque !== undefined) {
                        return dados.comentario_destaque ?? undefined;
                    }
                    if (atual?.id === dados.comentario!.id) {
                        return dados.comentario!;
                    }
                    return atual;
                });
            }
        });
    }, [subscribe, post.id]);

    async function handleVoto(tipo: "upvote" | "downvote") {
        if (votando || ehProprioPost) return;

        setVotando(true);
        setErroVoto("");

        try {
            if (meuVoto === tipo) {
                const res = await fetch(`/api/avaliacoes/${post.id}/voto`, { method: "DELETE" });
                const data: VotoResposta = await res.json();

                if (!res.ok) {
                    setErroVoto((data as { erro?: string }).erro || "Não foi possível remover o voto.");
                    return;
                }

                const { votos: novosVotos, meuVoto: novoMeuVoto } = extrairVotos(data);
                setVotos(novosVotos);
                setMeuVoto(novoMeuVoto);
            } else {
                const res = await fetch(`/api/avaliacoes/${post.id}/voto`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ tipo_voto: tipo }),
                });
                const data: VotoResposta = await res.json();

                if (!res.ok) {
                    setErroVoto((data as { erro?: string }).erro || "Não foi possível registrar o voto.");
                    return;
                }

                const { votos: novosVotos, meuVoto: novoMeuVoto } = extrairVotos(data);
                setVotos(novosVotos);
                setMeuVoto(novoMeuVoto || tipo);
            }
        } catch {
            setErroVoto("Não foi possível registrar o voto.");
        } finally {
            setVotando(false);
        }
    }

    async function handleApagar() {
        if (!aoApagar || apagando) return;
        setApagando(true);
        try {
            await aoApagar(post.id);
            setMenuAberto(false);
        } finally {
            setApagando(false);
        }
    }

    async function carregarComentarios() {
        if (carregandoComentarios) return;
        setCarregandoComentarios(true);
        setErroComentario("");

        try {
            const res = await fetch(`/api/avaliacoes/${post.id}/comentarios`);
            const data = await res.json();

            if (!res.ok) {
                setErroComentario(data.erro || "Não foi possível carregar comentários.");
                return;
            }

            setComentarios(Array.isArray(data) ? data : []);
            setComentariosCarregados(true);
        } catch {
            setErroComentario("Não foi possível carregar comentários.");
        } finally {
            setCarregandoComentarios(false);
        }
    }

    async function handleEnviarComentario(e: FormEvent) {
        e.preventDefault();
        if (enviandoComentario) return;
        if (!novoComentario.trim()) {
            setErroComentario("Digite um comentário.");
            return;
        }

        setEnviandoComentario(true);
        setErroComentario("");

        try {
            const res = await fetch(`/api/avaliacoes/${post.id}/comentarios`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ texto: novoComentario.trim() }),
            });
            const data = await res.json();

            if (!res.ok) {
                setErroComentario(data.erro || "Não foi possível enviar comentário.");
                return;
            }

            setComentarios((lista) => [...lista, data as ComentarioAvaliacao]);
            setNovoComentario("");
            setComentariosCarregados(true);
            setComentariosAbertos(true);
        } catch {
            setErroComentario("Não foi possível enviar comentário.");
        } finally {
            setEnviandoComentario(false);
        }
    }

    function atualizarComentarioLocal(comentarioAtualizado: ComentarioAvaliacao) {
        setComentarios((lista) =>
            lista.map((item) => (item.id === comentarioAtualizado.id ? { ...item, ...comentarioAtualizado } : item)),
        );
    }

    async function handleVotoComentario(comentario: ComentarioAvaliacao, tipo: "upvote" | "downvote") {
        try {
            const meuVotoAtual = comentario.voto_usuario || "";
            const remover = meuVotoAtual === tipo;
            const res = await fetch(`/api/comentarios/${comentario.id}/voto`, {
                method: remover ? "DELETE" : "POST",
                headers: remover ? undefined : { "Content-Type": "application/json" },
                body: remover ? undefined : JSON.stringify({ tipo_voto: tipo }),
            });
            const data = await res.json();

            if (!res.ok) {
                setErroComentario(data.erro || "Não foi possível votar no comentário.");
                return;
            }

            const atualizado = data as ComentarioAvaliacao;
            atualizarComentarioLocal(atualizado);
            if (comentarioDestaque?.id === atualizado.id) {
                setComentarioDestaque(atualizado);
            }
        } catch {
            setErroComentario("Não foi possível votar no comentário.");
        }
    }

    async function handleVotoComentarioDestaque(tipo: "upvote" | "downvote") {
        if (!comentarioDestaque) return;
        await handleVotoComentario(comentarioDestaque, tipo);
    }

    async function handleEnviarResposta(e: FormEvent) {
        e.preventDefault();
        if (!comentarioPaiAtivo) return;
        if (enviandoResposta) return;
        if (!textoResposta.trim()) {
            setErroComentario("Digite uma resposta.");
            return;
        }

        setEnviandoResposta(true);
        setErroComentario("");
        try {
            const res = await fetch(`/api/avaliacoes/${post.id}/comentarios`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ texto: textoResposta.trim(), pai_id: comentarioPaiAtivo }),
            });
            const data = await res.json();

            if (!res.ok) {
                setErroComentario(data.erro || "Não foi possível enviar resposta.");
                return;
            }

            setComentarios((lista) => [...lista, data as ComentarioAvaliacao]);
            setTextoResposta("");
            setComentarioPaiAtivo(null);
        } catch {
            setErroComentario("Não foi possível enviar resposta.");
        } finally {
            setEnviandoResposta(false);
        }
    }

    useEffect(() => {
        if (!menuAberto) {
            return;
        }

        function handleClickFora(evento: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(evento.target as Node)) {
                setMenuAberto(false);
            }
        }

        document.addEventListener("mousedown", handleClickFora);
        return () => document.removeEventListener("mousedown", handleClickFora);
    }, [menuAberto]);

    function renderComentario(no: ComentarioNo, nivel = 0) {
        const meuVotoComentario = no.voto_usuario || "";
        const respostaAtiva = comentarioPaiAtivo === no.id;
        const margem = nivel === 0 ? "ml-0" : nivel === 1 ? "ml-4" : nivel === 2 ? "ml-8" : "ml-12";
        const inicialComentario =
            no.usuario.nome?.charAt(0).toUpperCase() || no.usuario.nick?.charAt(0).toUpperCase() || "?";

        return (
            <div
                key={no.id}
                className={`${margem} mt-2 border-l-2 border-cinza-200 pl-4 transition-colors hover:border-cinza-400`}
            >
                <div className="flex gap-2.5">
                    <Link href={`/perfil/${no.usuario.nick}`} className="shrink-0 transition hover:opacity-80">
                        {no.usuario.image ? (
                            <Image
                                src={no.usuario.image}
                                alt={no.usuario.nome}
                                width={24}
                                height={24}
                                className="h-6 w-6 rounded-full object-cover"
                            />
                        ) : (
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-cinza-200 font-gabarito-bold text-[10px] text-azul-900">
                                {inicialComentario}
                            </div>
                        )}
                    </Link>
                    <div className="min-w-0 flex-1">
                        <p className="font-gabarito-bold text-xs text-azul-900">
                            <Link
                                href={`/perfil/${no.usuario.nick}`}
                                className="cursor-pointer transition hover:underline"
                            >
                                {no.usuario.nome}{" "}
                                <span className="font-gabarito-regular text-cinza-700">@{no.usuario.nick}</span>
                            </Link>
                        </p>
                        <p className="mt-0.5 whitespace-pre-wrap font-gabarito-regular text-sm text-cinza-700">{no.texto}</p>
                        <div className="mt-1 flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => handleVotoComentario(no, "upvote")}
                                className={`rounded-full px-2 py-0.5 text-xs transition hover:bg-background ${
                                    meuVotoComentario === "upvote" ? "text-orange-500" : "text-cinza-700"
                                }`}
                            >
                                ▲
                            </button>
                            <span className="font-gabarito-bold text-xs text-cinza-700">{no.votos}</span>
                            <button
                                type="button"
                                onClick={() => handleVotoComentario(no, "downvote")}
                                className={`rounded-full px-2 py-0.5 text-xs transition hover:bg-background ${
                                    meuVotoComentario === "downvote" ? "text-blue-500" : "text-cinza-700"
                                }`}
                            >
                                ▼
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setComentarioPaiAtivo((atual) => (atual === no.id ? null : no.id));
                                    setTextoResposta("");
                                }}
                                className="rounded-full px-2 py-0.5 text-xs text-azul-600 transition hover:bg-background"
                            >
                                Responder
                            </button>
                        </div>

                        {respostaAtiva && (
                            <form onSubmit={handleEnviarResposta} className="mt-2 flex items-center gap-2">
                                <input
                                    type="text"
                                    value={textoResposta}
                                    onChange={(e) => setTextoResposta(e.target.value)}
                                    placeholder="Responder comentário..."
                                    className="w-full rounded-full border border-gray-300 bg-white px-3 py-1.5 font-gabarito-regular text-xs outline-none focus:border-azul-600"
                                />
                                <button
                                    type="submit"
                                    disabled={enviandoResposta}
                                    className="rounded-full bg-azul-600 p-1.5 text-white transition hover:bg-azul-700 disabled:opacity-60"
                                    aria-label="Enviar resposta"
                                >
                                    {enviandoResposta ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <Send className="h-3.5 w-3.5" />
                                    )}
                                </button>
                            </form>
                        )}
                    </div>
                </div>

                {no.respostas.map((resposta) => renderComentario(resposta, nivel + 1))}
            </div>
        );
    }

    return (
        <Box className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
                <Link href={`/perfil/${usuario.nick}`} className="flex min-w-0 items-center gap-3 transition hover:opacity-80">
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
                        <p className="truncate font-gabarito-bold text-lg text-azul-900 hover:underline">{usuario.nome}</p>
                        <p className="truncate font-gabarito-regular text-sm text-cinza-700 hover:underline">@{usuario.nick}</p>
                    </div>
                </Link>
                <div ref={menuRef} className="relative flex shrink-0 items-center gap-1">
                    <span className="font-gabarito-regular text-sm text-cinza-700">{tempoRelativo(post.criado_em)}</span>
                    {podeApagar && aoApagar && (
                        <>
                            <button
                                type="button"
                                onClick={() => setMenuAberto((estado) => !estado)}
                                className="rounded-full p-1 text-cinza-700 transition hover:bg-background"
                                aria-label="Mais opções"
                            >
                                <MoreHorizontal className="h-5 w-5" />
                            </button>
                            {menuAberto && (
                                <div className="absolute right-0 top-7 z-10 min-w-44 rounded-xl border border-gray-200 bg-white p-1 shadow-lg">
                                    <button
                                        type="button"
                                        disabled={apagando}
                                        onClick={handleApagar}
                                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                                    >
                                        {apagando ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Trash2 className="h-4 w-4" />
                                        )}
                                        Apagar avaliação
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            <Link
                href={`/livros/${livro.id}`}
                className="flex gap-3 rounded-2xl bg-background p-3 transition hover:bg-[#ececef]"
            >
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
                    <p className="mt-1 font-gabarito-bold text-azul-600">
                        {"★".repeat(notaPost)}
                        {"☆".repeat(Math.max(0, 5 - notaPost))}
                    </p>
                </div>
            </Link>

            <p className="whitespace-pre-wrap font-gabarito-regular text-base leading-relaxed text-azul-900">{textoPost}</p>
            {comentarioDestaque && (
                <div className="mt-1 border-l-2 border-cinza-300 pl-3">
                    <div className="flex items-start gap-2.5">
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                                <Link
                                    href={`/perfil/${comentarioDestaque.usuario.nick}`}
                                    className="flex items-center gap-1.5 transition hover:opacity-80"
                                >
                                    {comentarioDestaque.usuario.image ? (
                                        <Image
                                            src={comentarioDestaque.usuario.image}
                                            alt={comentarioDestaque.usuario.nome}
                                            width={20}
                                            height={20}
                                            className="h-5 w-5 shrink-0 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cinza-200 font-gabarito-bold text-[9px] text-azul-900">
                                            {comentarioDestaque.usuario.nome.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <span className="truncate font-gabarito-bold text-xs text-cinza-600 hover:underline">
                                        @{comentarioDestaque.usuario.nick}
                                    </span>
                                </Link>
                            </div>
                            <p className="mt-0.5 line-clamp-3 font-gabarito-regular text-sm leading-snug text-azul-900/75">
                                {comentarioDestaque.texto}
                            </p>
                            <div className="mt-1 flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleVotoComentarioDestaque("upvote")}
                                    className={`rounded-full px-2 py-0.5 text-xs transition hover:bg-background ${
                                        comentarioDestaque.voto_usuario === "upvote"
                                            ? "text-orange-500"
                                            : "text-cinza-700"
                                    }`}
                                >
                                    ▲
                                </button>
                                <span className="font-gabarito-bold text-xs text-cinza-700">
                                    {comentarioDestaque.votos}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => handleVotoComentarioDestaque("downvote")}
                                    className={`rounded-full px-2 py-0.5 text-xs transition hover:bg-background ${
                                        comentarioDestaque.voto_usuario === "downvote"
                                            ? "text-blue-500"
                                            : "text-cinza-700"
                                    }`}
                                >
                                    ▼
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setComentarioPaiAtivo((atual) =>
                                            atual === comentarioDestaque.id ? null : comentarioDestaque.id,
                                        );
                                        setTextoResposta("");
                                        setComentariosAbertos(true);
                                        if (!comentariosCarregados) {
                                            carregarComentarios();
                                        }
                                    }}
                                    className="rounded-full px-2 py-0.5 text-xs text-azul-600 transition hover:bg-background"
                                >
                                    Responder
                                </button>
                            </div>
                            {comentarioPaiAtivo === comentarioDestaque.id && (
                                <form onSubmit={handleEnviarResposta} className="mt-2 flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={textoResposta}
                                        onChange={(e) => setTextoResposta(e.target.value)}
                                        placeholder="Responder comentário..."
                                        className="w-full rounded-full border border-gray-300 bg-white px-3 py-1.5 font-gabarito-regular text-xs outline-none focus:border-azul-600"
                                    />
                                    <button
                                        type="submit"
                                        disabled={enviandoResposta}
                                        className="rounded-full bg-azul-600 p-1.5 text-white transition hover:bg-azul-700 disabled:opacity-60"
                                        aria-label="Enviar resposta"
                                    >
                                        {enviandoResposta ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <Send className="h-3.5 w-3.5" />
                                        )}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="flex items-center gap-4 text-cinza-700">
                <button
                    type="button"
                    onClick={() => handleVoto("upvote")}
                    disabled={votando || ehProprioPost}
                    title={ehProprioPost ? "Você não pode votar na sua própria resenha" : "Upvote"}
                    className={`flex items-center gap-1 rounded-full px-2 py-1 transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-50 ${
                        meuVoto === "upvote" ? "text-azul-600" : ""
                    }`}
                >
                    {votando ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                        <ArrowBigUp className={`h-5 w-5 ${meuVoto === "upvote" ? "fill-azul-600" : ""}`} />
                    )}
                    <span className="font-gabarito-bold text-sm">{votos.upvotes}</span>
                </button>
                <button
                    type="button"
                    onClick={() => handleVoto("downvote")}
                    disabled={votando || ehProprioPost}
                    title={ehProprioPost ? "Você não pode votar na sua própria resenha" : "Downvote"}
                    className={`flex items-center gap-1 rounded-full px-2 py-1 transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-50 ${
                        meuVoto === "downvote" ? "text-red-600" : ""
                    }`}
                >
                    {votando ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                        <ArrowBigDown className={`h-5 w-5 ${meuVoto === "downvote" ? "fill-red-600" : ""}`} />
                    )}
                    <span className="font-gabarito-bold text-sm">{votos.downvotes}</span>
                </button>
                <button
                    type="button"
                    onClick={() => {
                        const abrir = !comentariosAbertos;
                        setComentariosAbertos(abrir);
                        if (abrir && !comentariosCarregados) {
                            carregarComentarios();
                        }
                    }}
                    className="flex items-center gap-1 rounded-full px-2 py-1 transition hover:bg-background"
                    title="Comentários"
                >
                    <MessageCircle className="h-4 w-4" />
                    <span className="font-gabarito-bold text-sm">{post.qtd_comentarios ?? 0}</span>
                </button>
            </div>

            {erroVoto && <p className="font-gabarito-regular text-xs text-red-600">{erroVoto}</p>}
            {comentariosAbertos && (
                <div className="space-y-3 rounded-xl border border-gray-200 bg-background p-3">
                    <form onSubmit={handleEnviarComentario} className="flex items-center gap-2">
                        <input
                            type="text"
                            value={novoComentario}
                            onChange={(e) => setNovoComentario(e.target.value)}
                            placeholder="Escreva um comentário..."
                            className="w-full rounded-full border border-gray-300 bg-white px-3 py-2 font-gabarito-regular text-sm outline-none focus:border-azul-600"
                        />
                        <button
                            type="submit"
                            disabled={enviandoComentario}
                            className="rounded-full bg-azul-600 p-2 text-white transition hover:bg-azul-700 disabled:opacity-60"
                            aria-label="Enviar comentário"
                        >
                            {enviandoComentario ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </button>
                    </form>

                    {carregandoComentarios ? (
                        <p className="font-gabarito-regular text-xs text-cinza-700">Carregando comentários...</p>
                    ) : comentarios.length === 0 ? (
                        <p className="font-gabarito-regular text-xs text-cinza-700">Nenhum comentário ainda.</p>
                    ) : (
                        <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
                            {comentariosArvore.map((comentario) => renderComentario(comentario))}
                        </div>
                    )}
                    {erroComentario && <p className="font-gabarito-regular text-xs text-red-600">{erroComentario}</p>}
                </div>
            )}
        </Box>
    );
}
