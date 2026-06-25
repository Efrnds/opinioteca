"use client";

import type { AvaliacaoFeed } from "@/types/avaliacao";
import { mediaUrl } from "@/lib/media";
import type { DiarioHistoricoResposta, DiarioResposta } from "@/types/diario";
import type { LivroPublico } from "@/types/livro";
import { Book, ChevronLeft, Loader2, Mail, MoreVertical } from "lucide-react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AlterarNickModal from "../../components/AlterarNickModal";
import AvatarPerfilEditavel from "../../components/AvatarPerfilEditavel";
import Box from "../../components/Box";
import PerfilLivroModal, { type LivroPerfilItem } from "../../components/PerfilLivroModal";
import PostCard from "../../components/PostCard";

type UsuarioPublico = {
    id: number;
    nome: string;
    nick: string;
    image?: string;
    email?: string;
};

type AbaPerfil = "avaliacoes" | "diario" | "livros";

type PerfilCache = {
    perfil: UsuarioPublico;
    avaliacoes: AvaliacaoFeed[];
    seguidores: UsuarioPublico[];
    seguindo: UsuarioPublico[];
    diario: DiarioResposta;
    historico: DiarioHistoricoResposta;
};

const cachePerfilPorNick = new Map<string, PerfilCache>();
const cacheLivroPorID = new Map<number, LivroPublico>();

const historicoVazio: DiarioHistoricoResposta = { registros: [], livros: [] };

function extrairLivroID(avaliacao: Partial<AvaliacaoFeed> & { livro_id?: number }) {
    if (avaliacao.livro?.id) {
        return Number(avaliacao.livro.id);
    }
    if (avaliacao.livro_id) {
        return Number(avaliacao.livro_id);
    }
    return 0;
}

function normalizarAvaliacoes(
    raw: unknown,
    perfil: UsuarioPublico,
    nickRota: string,
    livrosPorID: Map<number, LivroPublico>,
): AvaliacaoFeed[] {
    if (!Array.isArray(raw)) {
        return [];
    }

    return raw.map((item) => {
        const avaliacao = (item ?? {}) as Partial<AvaliacaoFeed>;
        const usuarioOriginal = avaliacao.usuario;
        const livroID = extrairLivroID(avaliacao as Partial<AvaliacaoFeed> & { livro_id?: number });
        const livroDoMapa = livroID > 0 ? livrosPorID.get(livroID) : undefined;
        const livroOriginal = avaliacao.livro;

        return {
            id: Number(avaliacao.id ?? 0),
            nota: Number(avaliacao.nota ?? 0),
            texto: avaliacao.texto ?? "",
            contem_spoiler: !!avaliacao.contem_spoiler,
            anexo_url: avaliacao.anexo_url,
            criado_em: avaliacao.criado_em ?? new Date().toISOString(),
            usuario: {
                id: Number(usuarioOriginal?.id ?? perfil.id ?? 0),
                nome: usuarioOriginal?.nome || perfil.nome || "Usuário",
                nick: usuarioOriginal?.nick || perfil.nick || nickRota,
                image: usuarioOriginal?.image || perfil.image,
            },
            livro: {
                id: Number(livroOriginal?.id ?? livroDoMapa?.id ?? livroID),
                titulo: livroOriginal?.titulo ?? livroDoMapa?.titulo ?? "Livro não informado",
                autor: livroOriginal?.autor ?? livroDoMapa?.autor ?? "Autor não informado",
                capa_url: livroOriginal?.capa_url ?? livroDoMapa?.capa_url,
            },
            votos: avaliacao.votos ?? { upvotes: 0, downvotes: 0, score: 0 },
            meu_voto: avaliacao.meu_voto,
        };
    });
}

function statusLivro(porcentagem: number): LivroPerfilItem["status"] {
    if (porcentagem >= 100) {
        return "lido";
    }
    if (porcentagem > 0) {
        return "lendo";
    }
    return "na_lista";
}

export default function PerfilNickPage() {
    const router = useRouter();
    const params = useParams<{ nick: string }>();
    const { data: session } = useSession();

    const nick = useMemo(() => {
        const valor = params?.nick;
        return typeof valor === "string" ? valor : "";
    }, [params]);

    const [perfil, setPerfil] = useState<UsuarioPublico | null>(null);
    const [avaliacoes, setAvaliacoes] = useState<AvaliacaoFeed[]>([]);
    const [seguidores, setSeguidores] = useState<UsuarioPublico[]>([]);
    const [seguindo, setSeguindo] = useState<UsuarioPublico[]>([]);
    const [diario, setDiario] = useState<DiarioResposta | null>(null);
    const [historico, setHistorico] = useState<DiarioHistoricoResposta>(historicoVazio);
    const [carregando, setCarregando] = useState(true);
    const [alternandoFollow, setAlternandoFollow] = useState(false);
    const [erro, setErro] = useState("");
    const [abaAtiva, setAbaAtiva] = useState<AbaPerfil>("avaliacoes");
    const [livroModalAberto, setLivroModalAberto] = useState(false);
    const [livroSelecionadoId, setLivroSelecionadoId] = useState<number | null>(null);
    const [atualizandoStatusLivro, setAtualizandoStatusLivro] = useState(false);
    const [menuOpcoesAberto, setMenuOpcoesAberto] = useState(false);
    const [alterarNickAberto, setAlterarNickAberto] = useState(false);
    const menuOpcoesRef = useRef<HTMLDivElement | null>(null);

    const meuNick = session?.user?.nick?.toLowerCase();
    const meuID = Number(session?.user?.id || 0);
    const ehMeuPerfil = !!meuNick && meuNick === nick.toLowerCase();
    const sigoPerfil =
        !ehMeuPerfil &&
        seguidores.some((usuario) => {
            if (meuID > 0 && usuario.id === meuID) {
                return true;
            }
            if (!meuNick) {
                return false;
            }
            return usuario.nick.toLowerCase() === meuNick;
        });

    const semanaExpandida = useMemo(() => {
        const base = diario?.semana ?? [];
        const ordemSegundaDomingo = [1, 2, 3, 4, 5, 6, 0];
        const fallback = ["S", "T", "Q", "Q", "S", "S", "D"];

        return ordemSegundaDomingo.map((indice, indexFallback) => ({
            dia: base[indice]?.dia ?? fallback[indexFallback],
            leu: !!base[indice]?.leu,
        }));
    }, [diario]);

    const livros = useMemo(() => {
        const mapa = new Map<number, LivroPerfilItem>();

        for (const item of historico.livros) {
            const porcentagem = Number(item.porcentagem_atual || 0);
            mapa.set(item.livro.id, {
                id: item.livro.id,
                titulo: item.livro.titulo,
                autor: item.livro.autor,
                capa_url: item.livro.capa_url,
                porcentagem,
                status: statusLivro(porcentagem),
                temResenha: false,
            });
        }

        for (const avaliacao of avaliacoes) {
            const livroID = avaliacao.livro.id;
            const existente = mapa.get(livroID);
            if (existente) {
                existente.temResenha = true;
                existente.status = "lido";
                existente.porcentagem = 100;
                mapa.set(livroID, existente);
                continue;
            }

            mapa.set(livroID, {
                id: livroID,
                titulo: avaliacao.livro.titulo,
                autor: avaliacao.livro.autor,
                capa_url: avaliacao.livro.capa_url,
                porcentagem: 100,
                status: "lido",
                temResenha: true,
            });
        }

        return Array.from(mapa.values());
    }, [avaliacoes, historico.livros]);

    const livroSelecionado = useMemo(
        () => livros.find((livro) => livro.id === livroSelecionadoId) ?? null,
        [livros, livroSelecionadoId],
    );

    const registrosLivroSelecionado = useMemo(() => {
        if (!livroSelecionadoId) {
            return [];
        }
        return historico.registros.filter((registro) => registro.livro_id === livroSelecionadoId);
    }, [historico.registros, livroSelecionadoId]);

    const avaliacaoLivroSelecionado = useMemo(() => {
        if (!livroSelecionadoId) {
            return undefined;
        }
        return avaliacoes.find((avaliacao) => avaliacao.livro.id === livroSelecionadoId);
    }, [avaliacoes, livroSelecionadoId]);

    const carregarDados = useCallback(async () => {
        if (!nick) {
            setCarregando(false);
            return;
        }

        setCarregando(true);
        setErro("");

        const cache = cachePerfilPorNick.get(nick);
        if (cache) {
            setPerfil(cache.perfil);
            setAvaliacoes(cache.avaliacoes);
            setSeguidores(cache.seguidores);
            setSeguindo(cache.seguindo);
            setDiario(cache.diario);
            setHistorico(cache.historico);
            setCarregando(false);
            return;
        }

        try {
            const [resPerfil, resAvaliacoes, resSeguidores, resSeguindo, resDiario, resHistorico] = await Promise.all([
                fetch(`/api/usuarios/${encodeURIComponent(nick)}`),
                fetch(`/api/usuarios/${encodeURIComponent(nick)}/avaliacoes`),
                fetch(`/api/usuarios/${encodeURIComponent(nick)}/seguidores`),
                fetch(`/api/usuarios/${encodeURIComponent(nick)}/seguindo`),
                fetch(`/api/diario/${encodeURIComponent(nick)}`),
                fetch(`/api/diario/${encodeURIComponent(nick)}/historico?limite=50`),
            ]);
            const [dataPerfil, dataAvaliacoes, dataSeguidores, dataSeguindo, dataDiario, dataHistorico] = await Promise.all([
                resPerfil.json(),
                resAvaliacoes.json(),
                resSeguidores.json(),
                resSeguindo.json(),
                resDiario.json().catch(() => null),
                resHistorico.json().catch(() => null),
            ]);

            if (!resPerfil.ok) {
                setErro(dataPerfil.erro || "Não foi possível carregar o perfil.");
                return;
            }

            if (!resAvaliacoes.ok) {
                setErro(dataAvaliacoes.erro || "Não foi possível carregar as resenhas.");
                return;
            }

            if (!resSeguidores.ok) {
                setErro(dataSeguidores.erro || "Não foi possível carregar os seguidores.");
                return;
            }

            if (!resSeguindo.ok) {
                setErro(dataSeguindo.erro || "Não foi possível carregar a lista de seguindo.");
                return;
            }

            const perfilData = dataPerfil as UsuarioPublico;
            const avaliacoesRaw = Array.isArray(dataAvaliacoes) ? dataAvaliacoes : [];
            const livroIDs = Array.from(
                new Set(
                    avaliacoesRaw
                        .map((item) => extrairLivroID(item as Partial<AvaliacaoFeed> & { livro_id?: number }))
                        .filter((id) => id > 0),
                ),
            );

            const historicoData =
                resHistorico.ok && dataHistorico && typeof dataHistorico === "object"
                    ? (dataHistorico as DiarioHistoricoResposta)
                    : historicoVazio;

            const livrosPorID = new Map<number, LivroPublico>();
            if (livroIDs.length > 0) {
                const livrosCarregados = await Promise.all(
                    livroIDs.map(async (livroID) => {
                        try {
                            if (cacheLivroPorID.has(livroID)) {
                                return { livroID, livro: cacheLivroPorID.get(livroID)! };
                            }
                            const resLivro = await fetch(`/api/livros/${livroID}`);
                            if (!resLivro.ok) {
                                return null;
                            }
                            const livro = (await resLivro.json()) as LivroPublico;
                            cacheLivroPorID.set(livroID, livro);
                            return { livroID, livro };
                        } catch {
                            return null;
                        }
                    }),
                );

                for (const item of livrosCarregados) {
                    if (item?.livro) {
                        livrosPorID.set(item.livroID, item.livro);
                    }
                }
            }

            const diarioData =
                resDiario.ok && dataDiario && typeof dataDiario === "object"
                    ? (dataDiario as DiarioResposta)
                    : { sequencia_atual: 0, semana: [] };
            const avaliacoesNorm = normalizarAvaliacoes(avaliacoesRaw, perfilData, nick, livrosPorID);
            const seguidoresData = Array.isArray(dataSeguidores) ? dataSeguidores : [];
            const seguindoData = Array.isArray(dataSeguindo) ? dataSeguindo : [];

            setPerfil(perfilData);
            setAvaliacoes(avaliacoesNorm);
            setSeguidores(seguidoresData);
            setSeguindo(seguindoData);
            setDiario(diarioData);
            setHistorico(historicoData);

            cachePerfilPorNick.set(nick, {
                perfil: perfilData,
                avaliacoes: avaliacoesNorm,
                seguidores: seguidoresData,
                seguindo: seguindoData,
                diario: diarioData,
                historico: historicoData,
            });
        } catch {
            setErro("Não foi possível carregar o perfil.");
        } finally {
            setCarregando(false);
        }
    }, [nick]);

    useEffect(() => {
        carregarDados();
    }, [carregarDados]);

    useEffect(() => {
        if (!menuOpcoesAberto) return;

        function handleClickFora(evento: MouseEvent) {
            if (menuOpcoesRef.current && !menuOpcoesRef.current.contains(evento.target as Node)) {
                setMenuOpcoesAberto(false);
            }
        }

        document.addEventListener("mousedown", handleClickFora);
        return () => document.removeEventListener("mousedown", handleClickFora);
    }, [menuOpcoesAberto]);

    async function alternarFollow() {
        if (!nick || alternandoFollow || ehMeuPerfil) {
            return;
        }

        setAlternandoFollow(true);
        try {
            const endpoint = sigoPerfil ? "deixar-de-seguir" : "seguir";
            const res = await fetch(`/api/usuarios/${encodeURIComponent(nick)}/${endpoint}`, { method: "POST" });
            const data = await res.json().catch(() => null);

            if (!res.ok) {
                setErro(data?.erro || "Não foi possível atualizar o relacionamento.");
                return;
            }

            cachePerfilPorNick.delete(nick);
            await carregarDados();
        } catch {
            setErro("Não foi possível atualizar o relacionamento.");
        } finally {
            setAlternandoFollow(false);
        }
    }

    async function apagarAvaliacao(avaliacaoId: number) {
        setErro("");

        try {
            const res = await fetch(`/api/avaliacoes/${avaliacaoId}`, { method: "DELETE" });
            const texto = await res.text();
            let data: { erro?: string } | null = null;

            if (texto) {
                try {
                    data = JSON.parse(texto) as { erro?: string };
                } catch {
                    data = null;
                }
            }

            if (!res.ok) {
                setErro(data?.erro || "Não foi possível apagar a avaliação.");
                return;
            }

            setAvaliacoes((lista) => lista.filter((avaliacao) => avaliacao.id !== avaliacaoId));
            cachePerfilPorNick.delete(nick);
        } catch {
            setErro("Não foi possível apagar a avaliação.");
        }
    }

    async function atualizarStatusLivro(status: LivroPerfilItem["status"]) {
        if (!ehMeuPerfil || !livroSelecionado) {
            return;
        }
        if (avaliacaoLivroSelecionado) {
            return;
        }

        setAtualizandoStatusLivro(true);
        setErro("");

        const porcentagem =
            status === "lido"
                ? 100
                : status === "lendo"
                  ? livroSelecionado.porcentagem > 0 && livroSelecionado.porcentagem < 100
                      ? livroSelecionado.porcentagem
                      : 50
                  : 0;

        try {
            const res = await fetch("/api/diario", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    livro_id: livroSelecionado.id,
                    paginas_lidas: 1,
                    porcentagem_leitura: porcentagem,
                }),
            });

            const data = await res.json().catch(() => null);
            if (!res.ok) {
                setErro(data?.erro || "Não foi possível atualizar o status do livro.");
                return;
            }

            cachePerfilPorNick.delete(nick);
            await carregarDados();
        } catch {
            setErro("Não foi possível atualizar o status do livro.");
        } finally {
            setAtualizandoStatusLivro(false);
        }
    }

    if (carregando) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-azul-600" />
            </div>
        );
    }

    if (erro) {
        return (
            <Box className="text-center">
                <p className="font-gabarito-bold text-lg text-red-600">{erro}</p>
            </Box>
        );
    }

    if (!perfil) {
        return (
            <Box className="text-center">
                <p className="font-gabarito-bold text-lg text-cinza-700">Perfil não encontrado.</p>
            </Box>
        );
    }

    const inicial = perfil.nome?.charAt(0).toUpperCase() || perfil.nick.charAt(0).toUpperCase();

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="rounded-full p-1 text-azul-900 transition hover:bg-background"
                    aria-label="Voltar"
                >
                    <ChevronLeft className="h-7 w-7" />
                </button>
                <h1 className="font-gabarito-bold text-2xl text-azul-900">@{perfil.nick}</h1>
            </div>

            <Box className="overflow-hidden p-0">
                <div className="h-32 w-full rounded-t-xl bg-gray-700" />

                <div className="px-4 pb-4">
                    <div className="-mt-12 flex items-end justify-between gap-3">
                        {ehMeuPerfil ? (
                            <AvatarPerfilEditavel
                                nome={perfil.nome}
                                nick={perfil.nick}
                                email={perfil.email ?? session?.user?.email ?? ""}
                                image={perfil.image}
                                onAtualizado={(novaImage) => {
                                    setPerfil((atual) => (atual ? { ...atual, image: novaImage } : atual));
                                    cachePerfilPorNick.delete(nick);
                                }}
                            />
                        ) : perfil.image ? (
                            <Image
                                src={mediaUrl(perfil.image)!}
                                alt={perfil.nome}
                                width={96}
                                height={96}
                                className="h-24 w-24 rounded-full border-4 border-white object-cover"
                            />
                        ) : (
                            <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-gray-200 font-gabarito-bold text-3xl text-azul-900">
                                {inicial}
                            </div>
                        )}

                        {!ehMeuPerfil ? (
                            <div className="flex items-center gap-2">
                                <Link
                                    href={`/mensagens?novoChat=${perfil.id}`}
                                    className="flex items-center gap-1.5 rounded-full border border-azul-600 px-4 py-2 font-gabarito-bold text-sm text-azul-600 transition hover:bg-azul-50"
                                >
                                    <Mail className="h-4 w-4" />
                                    Mensagem
                                </Link>
                                <button
                                    type="button"
                                    onClick={alternarFollow}
                                    disabled={alternandoFollow}
                                    className={`rounded-full px-5 py-2 font-gabarito-bold text-sm transition ${
                                        sigoPerfil
                                            ? "border border-gray-400 bg-white text-cinza-700 hover:bg-gray-50"
                                            : "bg-azul-600 text-white hover:bg-azul-700"
                                    }`}
                                >
                                    {alternandoFollow ? "Atualizando..." : sigoPerfil ? "Seguindo" : "Seguir"}
                                </button>
                            </div>
                        ) : (
                            <div ref={menuOpcoesRef} className="relative">
                                <button
                                    type="button"
                                    onClick={() => setMenuOpcoesAberto((estado) => !estado)}
                                    className="rounded-full p-2 text-azul-900 transition hover:bg-white/80"
                                    aria-label="Opções do perfil"
                                >
                                    <MoreVertical className="h-5 w-5" />
                                </button>
                                {menuOpcoesAberto && (
                                    <div className="absolute right-0 top-10 z-10 min-w-40 rounded-xl border border-gray-200 bg-white p-1 shadow-lg">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setMenuOpcoesAberto(false);
                                                setAlterarNickAberto(true);
                                            }}
                                            className="w-full rounded-lg px-3 py-2 text-left font-gabarito-regular text-sm text-azul-900 transition hover:bg-azul-50"
                                        >
                                            Alterar nick
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="mt-3">
                        <p className="font-gabarito-bold text-xl text-azul-900">{perfil.nome}</p>
                        <p className="font-gabarito-regular text-sm text-cinza-700">@{perfil.nick}</p>
                    </div>

                    <div className="mt-4 grid grid-cols-3 rounded-xl border border-gray-200 bg-white">
                        <div className="py-3 text-center">
                            <p className="font-gabarito-bold text-2xl text-azul-600">{avaliacoes.length}</p>
                            <p className="font-gabarito-regular text-xs text-cinza-700">Resenhas</p>
                        </div>
                        <div className="border-x border-gray-200 py-3 text-center">
                            <p className="font-gabarito-bold text-2xl text-azul-600">{seguidores.length}</p>
                            <p className="font-gabarito-regular text-xs text-cinza-700">Seguidores</p>
                        </div>
                        <div className="py-3 text-center">
                            <p className="font-gabarito-bold text-2xl text-azul-600">{seguindo.length}</p>
                            <p className="font-gabarito-regular text-xs text-cinza-700">Seguindo</p>
                        </div>
                    </div>
                </div>
            </Box>

            <Box className="flex gap-2 p-2">
                <button
                    type="button"
                    onClick={() => setAbaAtiva("avaliacoes")}
                    className={`rounded-full px-4 py-2 font-gabarito-bold text-sm transition ${
                        abaAtiva === "avaliacoes"
                            ? "bg-azul-600 text-white"
                            : "bg-background text-cinza-700 hover:bg-gray-200"
                    }`}
                >
                    Avaliações
                </button>
                <button
                    type="button"
                    onClick={() => setAbaAtiva("diario")}
                    className={`rounded-full px-4 py-2 font-gabarito-bold text-sm transition ${
                        abaAtiva === "diario" ? "bg-azul-600 text-white" : "bg-background text-cinza-700 hover:bg-gray-200"
                    }`}
                >
                    Registro de Leitura
                </button>
                <button
                    type="button"
                    onClick={() => setAbaAtiva("livros")}
                    className={`rounded-full px-4 py-2 font-gabarito-bold text-sm transition ${
                        abaAtiva === "livros" ? "bg-azul-600 text-white" : "bg-background text-cinza-700 hover:bg-gray-200"
                    }`}
                >
                    Livros
                </button>
            </Box>

            {abaAtiva === "avaliacoes" && (
                <>
                    {avaliacoes.length === 0 ? (
                        <Box className="text-center">
                            <p className="font-gabarito-bold text-xl text-azul-900">Nenhuma resenha ainda</p>
                            <p className="mt-1 font-gabarito-regular text-cinza-700">
                                Esse perfil ainda não publicou avaliações.
                            </p>
                        </Box>
                    ) : (
                        avaliacoes.map((avaliacao) => (
                            <PostCard
                                key={avaliacao.id}
                                post={avaliacao}
                                podeApagar={ehMeuPerfil}
                                aoApagar={ehMeuPerfil ? apagarAvaliacao : undefined}
                            />
                        ))
                    )}
                </>
            )}

            {abaAtiva === "diario" && (
                <Box className="flex flex-col gap-5">
                    <div className="flex items-center justify-between">
                        <h2 className="font-gabarito-bold text-xl text-azul-900">Semana de leitura</h2>
                        <p className="font-gabarito-bold text-xl text-[#ed2d00]">
                            {diario?.sequencia_atual ?? 0} <span className="text-2xl">🔥</span>
                        </p>
                    </div>

                    <div className="grid grid-cols-7 gap-3">
                        {semanaExpandida.map((dia, index) => (
                            <div key={`${dia.dia}-${index}`} className="flex flex-col items-center gap-2">
                                <div
                                    className={`flex h-12 w-12 items-center justify-center rounded-full ${
                                        dia.leu ? "bg-azul-800" : "bg-azul-200"
                                    }`}
                                >
                                    <Book className={`h-5 w-5 ${dia.leu ? "text-azul-200" : "text-azul-400"}`} />
                                </div>
                                <p className={`font-gabarito-bold text-sm ${dia.leu ? "text-azul-800" : "text-azul-400"}`}>
                                    {dia.dia}
                                </p>
                            </div>
                        ))}
                    </div>

                    <div className="space-y-2">
                        <h3 className="font-gabarito-bold text-base text-azul-900">Últimos registros</h3>
                        {historico.registros.length === 0 ? (
                            <p className="font-gabarito-regular text-sm text-cinza-700">
                                Você ainda não tem registros de leitura.
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {historico.registros.slice(0, 8).map((registro) => (
                                    <div
                                        key={registro.id}
                                        className="rounded-xl border border-gray-200 bg-white px-3 py-2"
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="truncate font-gabarito-bold text-sm text-azul-900">
                                                    {registro.livro.titulo}
                                                </p>
                                                <p className="font-gabarito-regular text-xs text-cinza-700">
                                                    {registro.paginas_lidas} páginas
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-gabarito-bold text-sm text-azul-600">
                                                    {Math.round(registro.porcentagem_leitura)}%
                                                </p>
                                                <p className="font-gabarito-regular text-[11px] text-cinza-700">
                                                    {new Date(registro.data_registro).toLocaleDateString("pt-BR")}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </Box>
            )}

            {abaAtiva === "livros" && (
                <Box className="flex flex-col gap-4">
                    <h2 className="font-gabarito-bold text-xl text-azul-900">Livros</h2>
                    {livros.length === 0 ? (
                        <p className="font-gabarito-regular text-cinza-700">Nenhum livro ainda.</p>
                    ) : (
                        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4">
                            {livros.map((livro) => (
                                <button
                                    key={`${livro.id}-${livro.titulo}`}
                                    type="button"
                                    onClick={() => {
                                        setLivroSelecionadoId(livro.id);
                                        setLivroModalAberto(true);
                                    }}
                                    className="group flex flex-col gap-2 rounded-xl bg-background p-2 text-left transition hover:-translate-y-0.5 hover:shadow-md"
                                >
                                    {livro.capa_url ? (
                                        <Image
                                            src={livro.capa_url}
                                            alt={livro.titulo}
                                            width={120}
                                            height={180}
                                            className="h-40 w-full rounded-lg object-cover"
                                            unoptimized
                                        />
                                    ) : (
                                        <div className="flex h-40 w-full items-center justify-center rounded-lg bg-azul-200 text-3xl">
                                            📖
                                        </div>
                                    )}
                                    <p className="line-clamp-2 font-gabarito-bold text-xs text-azul-900">{livro.titulo}</p>
                                    <p
                                        className={`rounded-full px-2 py-1 text-center font-gabarito-bold text-[10px] ${
                                            livro.status === "lido"
                                                ? "bg-green-100 text-green-700"
                                                : livro.status === "lendo"
                                                  ? "bg-amber-100 text-amber-700"
                                                  : "bg-gray-200 text-cinza-700"
                                        }`}
                                    >
                                        {livro.status === "lido" ? "Lido" : livro.status === "lendo" ? "Lendo" : "Na lista"}
                                    </p>
                                    <p className="font-gabarito-bold text-[11px] text-azul-600">
                                        {Math.round(livro.porcentagem)}%
                                    </p>
                                </button>
                            ))}
                        </div>
                    )}
                </Box>
            )}

            <PerfilLivroModal
                open={livroModalAberto}
                onClose={() => setLivroModalAberto(false)}
                livro={livroSelecionado}
                registros={registrosLivroSelecionado}
                avaliacao={avaliacaoLivroSelecionado}
                podeAtualizarStatus={ehMeuPerfil}
                atualizandoStatus={atualizandoStatusLivro}
                onAtualizarStatus={atualizarStatusLivro}
            />

            <AlterarNickModal
                open={alterarNickAberto}
                onClose={() => setAlterarNickAberto(false)}
                nickAtual={perfil.nick}
                nome={perfil.nome}
                email={perfil.email ?? session?.user?.email ?? ""}
                image={perfil.image}
                onSalvo={(novoNick) => {
                    cachePerfilPorNick.delete(nick);
                    cachePerfilPorNick.delete(novoNick);
                    if (novoNick !== nick) {
                        router.replace(`/perfil/${encodeURIComponent(novoNick)}`);
                    } else {
                        setPerfil((atual) => (atual ? { ...atual, nick: novoNick } : atual));
                    }
                }}
            />
        </div>
    );
}
