"use client";

import type { AvaliacaoFeed, ComentarioAvaliacao, ContadoresVoto } from "@/types/avaliacao";
import type { TemaAparencia } from "@/types/configuracao";
import { avaliacaoTemSpoiler, urlAvaliacao } from "@/lib/avaliacao";
import { mediaUrl } from "@/lib/media";
import {
    coresTextoSobreFundo,
    fundoEhClaro,
    resolverFundoContrasteDestaque,
    resolverTomDestaque50,
    type PreferenciaTema,
} from "@/lib/tema";
import { usePlano } from "./PlanoProvider";
import { ArrowBigDown, ArrowBigUp, Flag, Loader2, MessageCircle, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Box from "./Box";
import { useAuthGate } from "./AuthGateProvider";
import ComentarioComposer, { ComentarioMidia } from "./ComentarioComposer";
import { useConfiguracoes } from "./ConfiguracoesProvider";
import BadgeTop from "./BadgeTop";
import BadgeRank from "./BadgeRank";
import AvatarUsuario from "./AvatarUsuario";
import DenunciarModal from "./DenunciarModal";
import EditarAvaliacaoModal from "./EditarAvaliacaoModal";
import NomeUsuario from "./NomeUsuario";
import PlanoUpgradeModal from "./PlanoUpgradeModal";
import SpoilerGuard from "./SpoilerGuard";
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
    onRemovido?: (avaliacaoId: number) => void;
    onAtualizado?: (avaliacaoId: number, dados: { nota: number; texto: string }) => void;
    ocultarLinkPost?: boolean;
    comentariosIniciaisAbertos?: boolean;
    midiaComLightbox?: boolean;
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

function adicionarComentarioUnico(lista: ComentarioAvaliacao[], comentario: ComentarioAvaliacao) {
    if (lista.some((c) => c.id === comentario.id)) return lista;
    return [...lista, comentario];
}

export default function PostCard({
    post,
    podeApagar = false,
    aoApagar,
    onRemovido,
    onAtualizado,
    ocultarLinkPost = false,
    comentariosIniciaisAbertos = false,
    midiaComLightbox = false,
}: PostCardProps) {
    const { data: session, status } = useSession();
    const { exigirAuth } = useAuthGate();
    const { config } = useConfiguracoes();
    const { subscribe } = useWebSocket();
    const usuario = post?.usuario ?? { id: 0, nome: "Usuário", nick: "desconhecido", image: undefined };
    const livro = post?.livro ?? { id: 0, titulo: "Livro não informado", autor: "Autor não informado", capa_url: undefined };
    const textoPost = post?.texto ?? "";
    const notaPost = Number.isFinite(post?.nota) ? post.nota : 0;

    const prefLivro: PreferenciaTema = {
        tema: (config.tema ?? "claro") as TemaAparencia,
        daltonismoTipo: config.daltonismoTipo ?? "deuteranopia",
        corDestaque: config.corDestaque ?? "azul",
        corFundoTexto: config.corFundoTexto ?? null,
        corSuperficie: config.corSuperficie ?? null,
        corTexto: config.corTexto ?? null,
        corHover: config.corHover ?? null,
    };
    const hoverLivroBg = resolverTomDestaque50(prefLivro);
    const coresHoverLivro = coresTextoSobreFundo(hoverLivroBg);
    const fundoPagina = resolverFundoContrasteDestaque(prefLivro);
    // Estrelas: fundo da página quando contraste; senão título de alto contraste.
    const estrelaHover =
        fundoEhClaro(hoverLivroBg) === fundoEhClaro(fundoPagina)
            ? coresHoverLivro.titulo
            : fundoPagina;
    const estiloHoverLivro = {
        "--livro-hover-bg": hoverLivroBg,
        "--livro-hover-titulo": coresHoverLivro.titulo,
        "--livro-hover-subtitulo": coresHoverLivro.subtitulo,
        "--livro-hover-estrela": estrelaHover,
    } as CSSProperties;

    const [votos, setVotos] = useState(post?.votos ?? { upvotes: 0, downvotes: 0, score: 0 });
    const [meuVoto, setMeuVoto] = useState(post.meu_voto);
    const [rankAutor, setRankAutor] = useState(usuario.rankConfiabilidade ?? 0);
    const [votando, setVotando] = useState(false);
    const [erroVoto, setErroVoto] = useState("");
    const [menuAberto, setMenuAberto] = useState(false);
    const [apagando, setApagando] = useState(false);
    const [comentariosAbertos, setComentariosAbertos] = useState(comentariosIniciaisAbertos);
    const [comentariosCarregados, setComentariosCarregados] = useState(false);
    const [comentarios, setComentarios] = useState<ComentarioAvaliacao[]>([]);
    const [carregandoComentarios, setCarregandoComentarios] = useState(false);
    const [enviandoComentario, setEnviandoComentario] = useState(false);
    const [comentarioPaiAtivo, setComentarioPaiAtivo] = useState<number | null>(null);
    const [enviandoResposta, setEnviandoResposta] = useState(false);
    const [erroComentario, setErroComentario] = useState("");
    const [erroApagar, setErroApagar] = useState("");
    const [denunciarAberto, setDenunciarAberto] = useState(false);
    const [denunciarComentarioId, setDenunciarComentarioId] = useState<number | null>(null);
    const [editarAberto, setEditarAberto] = useState(false);
    const [upgradeEditarAberto, setUpgradeEditarAberto] = useState(false);
    const [textoLocal, setTextoLocal] = useState(textoPost);
    const [notaLocal, setNotaLocal] = useState(notaPost);
    const menuRef = useRef<HTMLDivElement | null>(null);

    const { temPlanoTop: temTop } = usePlano();

    const ehProprioPost = session?.user?.id === String(usuario.id);
    const podeExcluir = ehProprioPost || (podeApagar && !!aoApagar);
    const podeEditar = ehProprioPost;
    const podeDenunciar = !!session?.user?.id && !ehProprioPost;
    const mostrarMenu = podeExcluir || podeDenunciar || podeEditar;
    const temSpoiler = avaliacaoTemSpoiler(post.contem_spoiler);
    const ocultarSpoiler = temSpoiler && (status !== "authenticated" || config.ocultarSpoilersPadrao);
    const contaApagada = !!(usuario as { contaApagada?: boolean }).contaApagada;
    const meuID = session?.user?.id ?? "";
    const comentariosArvore = useMemo(() => montarArvoreComentarios(comentarios), [comentarios]);

    useEffect(() => {
        setTextoLocal(post?.texto ?? "");
        setNotaLocal(Number.isFinite(post?.nota) ? post.nota : 0);
    }, [post?.texto, post?.nota]);

    useEffect(() => {
        setVotos(post.votos);
        setMeuVoto(post.meu_voto);
        setRankAutor(post.usuario.rankConfiabilidade ?? 0);
    }, [post.votos, post.meu_voto, post.usuario.rankConfiabilidade]);

    function deltaRankDoVoto(anterior?: string, proximo?: string) {
        const valor = (tipo?: string) => (tipo === "upvote" ? 1 : tipo === "downvote" ? -1 : 0);
        return valor(proximo) - valor(anterior);
    }

    useEffect(() => {
        return subscribe((tipo, payload) => {
            const dados = payload as {
                avaliacao_id: number;
                votos?: typeof votos;
                comentario?: ComentarioAvaliacao;
            };

            if (dados.avaliacao_id !== post.id) return;

            if (tipo === "AVALIACAO_ATUALIZADA" && dados.votos) {
                setVotos(dados.votos);
            }

            if (tipo === "NOVO_COMENTARIO" && dados.comentario) {
                const euEnviei = meuID === String(dados.comentario.usuario.id);
                if (!euEnviei) {
                    setComentarios((lista) => adicionarComentarioUnico(lista, dados.comentario!));
                }
                setComentariosCarregados(true);
            }

            if (tipo === "COMENTARIO_ATUALIZADO" && dados.comentario) {
                setComentarios((lista) =>
                    lista.map((item) =>
                        item.id === dados.comentario!.id ? { ...item, ...dados.comentario! } : item,
                    ),
                );
            }
        });
    }, [subscribe, post.id, meuID]);

    async function handleVoto(tipo: "upvote" | "downvote") {
        if (votando || ehProprioPost) return;
        if (!exigirAuth()) return;

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
                setRankAutor((atual) => Math.max(0, atual + deltaRankDoVoto(meuVoto, undefined)));
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
                setRankAutor((atual) => Math.max(0, atual + deltaRankDoVoto(meuVoto, tipo)));
            }
        } catch {
            setErroVoto("Não foi possível registrar o voto.");
        } finally {
            setVotando(false);
        }
    }

    async function handleApagar() {
        if (!podeExcluir || apagando) return;

        setApagando(true);
        setErroApagar("");
        try {
            if (aoApagar) {
                await aoApagar(post.id);
            } else {
                const res = await fetch(`/api/avaliacoes/${post.id}`, { method: "DELETE" });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                    setErroApagar((data as { erro?: string }).erro || "Não foi possível apagar a avaliação.");
                    return;
                }
                onRemovido?.(post.id);
            }
            setMenuAberto(false);
        } catch {
            setErroApagar("Não foi possível apagar a avaliação.");
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

    useEffect(() => {
        if (comentariosIniciaisAbertos && !comentariosCarregados) {
            void carregarComentarios();
        }
    }, [comentariosIniciaisAbertos, comentariosCarregados]);

    async function postarComentario(
        payload: { texto: string; anexoUrl?: string },
        paiId?: number,
    ) {
        if (!exigirAuth()) return;

        if (paiId) {
            setEnviandoResposta(true);
        } else {
            setEnviandoComentario(true);
        }
        setErroComentario("");

        try {
            const body: Record<string, string | number> = { texto: payload.texto };
            if (payload.anexoUrl) body.anexo_url = payload.anexoUrl;
            if (paiId) body.pai_id = paiId;

            const res = await fetch(`/api/avaliacoes/${post.id}/comentarios`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const data = await res.json();

            if (!res.ok) {
                setErroComentario(data.erro || "Não foi possível enviar comentário.");
                throw new Error(data.erro || "erro");
            }

            setComentarios((lista) => adicionarComentarioUnico(lista, data as ComentarioAvaliacao));
            setComentariosCarregados(true);
            setComentariosAbertos(true);
            if (paiId) setComentarioPaiAtivo(null);
        } catch (erro) {
            if (erro instanceof Error && erro.message !== "erro") {
                setErroComentario(erro.message);
            } else if (!(erro instanceof Error)) {
                setErroComentario("Não foi possível enviar comentário.");
            }
            throw erro;
        } finally {
            if (paiId) {
                setEnviandoResposta(false);
            } else {
                setEnviandoComentario(false);
            }
        }
    }

    function atualizarComentarioLocal(comentarioAtualizado: ComentarioAvaliacao) {
        setComentarios((lista) =>
            lista.map((item) => (item.id === comentarioAtualizado.id ? { ...item, ...comentarioAtualizado } : item)),
        );
    }

    async function handleVotoComentario(comentario: ComentarioAvaliacao, tipo: "upvote" | "downvote") {
        if (!exigirAuth()) return;
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
        } catch {
            setErroComentario("Não foi possível votar no comentário.");
        }
    }

    async function handleEnviarResposta(payload: { texto: string; anexoUrl?: string }) {
        if (!comentarioPaiAtivo) return;
        await postarComentario(payload, comentarioPaiAtivo);
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
        const ehProprioComentario = meuID === String(no.usuario.id);
        const podeDenunciarComentario = !!meuID && !ehProprioComentario;
        const margem = nivel === 0 ? "ml-0" : nivel === 1 ? "ml-4" : nivel === 2 ? "ml-8" : "ml-12";

        return (
            <div
                key={no.id}
                className={`${margem} mt-3 border-l border-white/80 pl-3 first:mt-0`}
            >
                <div className="flex gap-2.5">
                    <Link href={`/perfil/${no.usuario.nick}`} className="shrink-0 transition hover:opacity-80">
                        <AvatarUsuario
                            image={no.usuario.image}
                            nome={no.usuario.nome}
                            nick={no.usuario.nick}
                            assinaturaId={no.usuario.assinaturaId}
                            temPlanoPro={no.usuario.temPlanoPro}
                            size={28}
                            className="ring-1 ring-black/5"
                            inicialClassName="text-[10px]"
                        />
                    </Link>
                    <div className="min-w-0 flex-1">
                        <div className="rounded-2xl bg-white/70 px-3 py-2 ring-1 ring-black/5 backdrop-blur-sm">
                            <p className="font-gabarito-bold text-xs text-azul-900">
                                <Link
                                    href={`/perfil/${no.usuario.nick}`}
                                    className="cursor-pointer transition hover:underline"
                                >
                                    <NomeUsuario
                                        inline
                                        nome={no.usuario.nome}
                                        nick={no.usuario.nick}
                                        assinaturaId={no.usuario.assinaturaId}
                                        temPlanoTop={no.usuario.temPlanoTop}
                                        temPlanoPro={no.usuario.temPlanoPro}
                                        mostrarNick
                                        nomeClassName="font-gabarito-bold text-xs text-azul-900"
                                        nickClassName="font-gabarito-regular text-cinza-600"
                                    />
                                </Link>
                            </p>
                            {no.texto && (
                                <p className="mt-0.5 whitespace-pre-wrap font-gabarito-regular text-sm text-azul-900/90">
                                    {no.texto}
                                </p>
                            )}
                            <ComentarioMidia url={no.anexo_url} expandido comLightbox={midiaComLightbox} />
                        </div>
                        <div className="mt-1.5 flex items-center gap-2 px-1">
                            <button
                                type="button"
                                onClick={() => handleVotoComentario(no, "upvote")}
                                className={`rounded-full px-2 py-0.5 text-xs transition hover:bg-white/60 ${
                                    meuVotoComentario === "upvote" ? "text-orange-500" : "text-cinza-600"
                                }`}
                            >
                                ▲
                            </button>
                            <span className="font-gabarito-bold text-xs text-cinza-600">{no.votos}</span>
                            <button
                                type="button"
                                onClick={() => handleVotoComentario(no, "downvote")}
                                className={`rounded-full px-2 py-0.5 text-xs transition hover:bg-white/60 ${
                                    meuVotoComentario === "downvote" ? "text-blue-500" : "text-cinza-600"
                                }`}
                            >
                                ▼
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setComentarioPaiAtivo((atual) => (atual === no.id ? null : no.id));
                                }}
                                className="rounded-full px-2 py-0.5 text-xs text-azul-600 transition hover:bg-white/60"
                            >
                                Responder
                            </button>
                            {podeDenunciarComentario && (
                                <button
                                    type="button"
                                    onClick={() => setDenunciarComentarioId(no.id)}
                                    className="rounded-full px-2 py-0.5 text-xs text-cinza-600 transition hover:bg-white/60"
                                >
                                    Denunciar
                                </button>
                            )}
                            <span className="font-gabarito-regular text-[10px] text-cinza-500">
                                {tempoRelativo(no.criado_em)}
                            </span>
                        </div>

                        {respostaAtiva && (
                            <div className="mt-2">
                                <ComentarioComposer
                                    compacto
                                    placeholder="Responder..."
                                    enviando={enviandoResposta}
                                    onEnviar={handleEnviarResposta}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {no.respostas.map((resposta) => renderComentario(resposta, nivel + 1))}
            </div>
        );
    }

    return (
        <>
        <Box className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
                <Link
                    href={contaApagada ? "#" : `/perfil/${usuario.nick}`}
                    onClick={(e) => {
                        if (contaApagada) e.preventDefault();
                    }}
                    className={`flex min-w-0 items-center gap-3 transition ${contaApagada ? "cursor-default" : "hover:opacity-80"}`}
                >
                    {contaApagada ? (
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-200 font-gabarito-bold text-lg text-azul-900">
                            ?
                        </div>
                    ) : (
                        <AvatarUsuario
                            image={usuario.image}
                            nome={usuario.nome}
                            nick={usuario.nick}
                            assinaturaId={usuario.assinaturaId}
                            temPlanoPro={usuario.temPlanoPro}
                            size={44}
                            className="h-11 w-11"
                            inicialClassName="text-lg"
                        />
                    )}
                    <div className="min-w-0">
                        <p className={`flex flex-wrap items-center gap-1.5 truncate font-gabarito-bold text-lg text-azul-900 ${contaApagada ? "" : "hover:underline"}`}>
                            <span>{contaApagada ? "Conta apagada" : usuario.nome}</span>
                            {!contaApagada ? (
                                <>
                                    <BadgeTop
                                        temPlanoTop={usuario.temPlanoTop}
                                        temPlanoPro={usuario.temPlanoPro}
                                        assinaturaId={usuario.assinaturaId}
                                    />
                                    <BadgeRank rank={rankAutor} compact />
                                </>
                            ) : null}
                        </p>
                        {!contaApagada && (
                            <p className="truncate font-gabarito-regular text-sm text-cinza-700 hover:underline">
                                @{usuario.nick}
                                {temSpoiler && (
                                    <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 font-gabarito-bold text-[10px] uppercase text-amber-800">
                                        Spoiler
                                    </span>
                                )}
                            </p>
                        )}
                    </div>
                </Link>
                <div ref={menuRef} className="relative flex shrink-0 items-center gap-1">
                    <span className="font-gabarito-regular text-sm text-cinza-700">{tempoRelativo(post.criado_em)}</span>
                    {mostrarMenu && (
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
                                    {podeEditar && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setMenuAberto(false);
                                                if (temTop) {
                                                    setEditarAberto(true);
                                                } else {
                                                    setUpgradeEditarAberto(true);
                                                }
                                            }}
                                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-azul-900 transition hover:bg-azul-50"
                                        >
                                            <Pencil className="h-4 w-4" />
                                            Editar resenha
                                        </button>
                                    )}
                                    {podeDenunciar && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setMenuAberto(false);
                                                setDenunciarAberto(true);
                                            }}
                                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-azul-900 transition hover:bg-azul-50"
                                        >
                                            <Flag className="h-4 w-4" />
                                            Denunciar
                                        </button>
                                    )}
                                    {podeExcluir && (
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
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            <Link
                href={`/livros/${livro.id}`}
                className="group flex gap-3 rounded-2xl bg-background p-3 transition hover:bg-[var(--livro-hover-bg)]"
                style={estiloHoverLivro}
            >
                {mediaUrl(livro.capa_url) ? (
                    <Image
                        src={mediaUrl(livro.capa_url)!}
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
                    <p className="truncate font-gabarito-bold text-base text-azul-900 transition-colors group-hover:text-[color:var(--livro-hover-titulo)]">
                        {livro.titulo}
                    </p>
                    <p className="truncate font-gabarito-regular text-sm text-cinza-700 transition-colors group-hover:text-[color:var(--livro-hover-subtitulo)]">
                        {livro.autor}
                    </p>
                    <p className="mt-1 font-gabarito-bold text-azul-600 transition-colors group-hover:text-[color:var(--livro-hover-estrela)]">
                        {"★".repeat(notaLocal)}
                        {"☆".repeat(Math.max(0, 5 - notaLocal))}
                    </p>
                </div>
            </Link>

            <SpoilerGuard
                key={`spoiler-${post.id}-${temSpoiler}`}
                ativo={ocultarSpoiler}
                mensagem={
                    ehProprioPost
                        ? "Você marcou esta resenha como spoiler"
                        : "Esta avaliação contém spoiler"
                }
            >
                {ocultarLinkPost ? (
                    <div className="flex flex-col gap-3">
                        {textoLocal && (
                            <p className="whitespace-pre-wrap font-gabarito-regular text-base leading-relaxed text-azul-900">
                                {textoLocal}
                            </p>
                        )}
                        <ComentarioMidia url={post.anexo_url} alt="Imagem da resenha" expandido comLightbox={midiaComLightbox} />
                    </div>
                ) : (
                    <Link
                        href={urlAvaliacao(post.id)}
                        className="flex flex-col gap-3 rounded-2xl transition hover:bg-background/60"
                    >
                        {textoLocal && (
                            <p className="whitespace-pre-wrap font-gabarito-regular text-base leading-relaxed text-azul-900">
                                {textoLocal}
                            </p>
                        )}
                        <ComentarioMidia url={post.anexo_url} alt="Imagem da resenha" expandido comLightbox={midiaComLightbox} />
                    </Link>
                )}
            </SpoilerGuard>

            {erroApagar && <p className="font-gabarito-regular text-xs text-red-600">{erroApagar}</p>}

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
                <div className="space-y-3 rounded-2xl border border-white/60 bg-white/40 p-3 shadow-sm ring-1 ring-black/5 backdrop-blur-md">
                    <ComentarioComposer
                        enviando={enviandoComentario}
                        onEnviar={(payload) => postarComentario(payload)}
                    />

                    {carregandoComentarios ? (
                        <div className="flex items-center gap-2 py-2">
                            <Loader2 className="h-4 w-4 animate-spin text-azul-600" />
                            <p className="font-gabarito-regular text-xs text-cinza-600">Carregando comentários...</p>
                        </div>
                    ) : comentarios.length === 0 ? (
                        <p className="py-2 text-center font-gabarito-regular text-xs text-cinza-600">
                            Nenhum comentário ainda. Seja o primeiro!
                        </p>
                    ) : (
                        <div className="max-h-80 space-y-1 overflow-y-auto pr-1">
                            {comentariosArvore.map((comentario) => renderComentario(comentario))}
                        </div>
                    )}
                    {erroComentario && <p className="font-gabarito-regular text-xs text-red-600">{erroComentario}</p>}
                </div>
            )}
        </Box>

        <DenunciarModal
            open={denunciarAberto}
            onClose={() => setDenunciarAberto(false)}
            tipoEntidade="avaliacao"
            referenciaId={post.id}
            titulo="Denunciar avaliação"
        />
        <DenunciarModal
            open={denunciarComentarioId !== null}
            onClose={() => setDenunciarComentarioId(null)}
            tipoEntidade="comentario"
            referenciaId={denunciarComentarioId ?? 0}
            titulo="Denunciar comentário"
        />
        {podeEditar && (
            <>
                <EditarAvaliacaoModal
                    open={editarAberto}
                    onClose={() => setEditarAberto(false)}
                    avaliacaoId={post.id}
                    notaInicial={notaLocal}
                    textoInicial={textoLocal}
                    onSalvo={(dados) => {
                        setTextoLocal(dados.texto);
                        setNotaLocal(dados.nota);
                        onAtualizado?.(post.id, dados);
                    }}
                />
                <PlanoUpgradeModal
                    open={upgradeEditarAberto}
                    onClose={() => setUpgradeEditarAberto(false)}
                    recurso="edicaoResenhas"
                />
            </>
        )}
        </>
    );
}
