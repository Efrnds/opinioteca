"use client";

import type { PlanoStatus } from "@/types/plano";
import type { AvaliacaoFeed } from "@/types/avaliacao";
import { avaliacaoTemSpoiler } from "@/lib/avaliacao";
import { mediaUrl } from "@/lib/media";
import {
    deletePerfilCache,
    getLivroCache,
    getPerfilCache,
    hasLivroCache,
    setLivroCache,
    setPerfilCache,
    updatePerfilCache,
    type PerfilCacheUsuario,
} from "@/lib/perfil-cache";
import type { DiarioHistoricoResposta, DiarioResposta, EstatisticasLeituraResposta } from "@/types/diario";
import type { EstanteItem, EstanteResposta, StatusEstante } from "@/types/estante";
import { ROTULOS_STATUS_ESTANTE } from "@/types/estante";
import type { LivroPublico } from "@/types/livro";
import { Book, ChevronLeft, Flag, Loader2, Mail, MoreVertical, Plus, UserCheck, UserPlus } from "lucide-react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AlterarNickModal from "../../components/AlterarNickModal";
import AdicionarLivroEstanteModal from "../../components/AdicionarLivroEstanteModal";
import BadgeRank from "../../components/BadgeRank";
import BadgeTop from "../../components/BadgeTop";
import EstatisticasLeitura from "../../components/EstatisticasLeitura";
import PlanoUpgradeModal from "../../components/PlanoUpgradeModal";
import { useAuthGate } from "../../components/AuthGateProvider";
import AvatarPerfilEditavel from "../../components/AvatarPerfilEditavel";
import AvatarUsuario from "../../components/AvatarUsuario";
import BannerPerfil from "../../components/BannerPerfil";
import Box from "../../components/Box";
import DenunciarModal from "../../components/DenunciarModal";
import ListaUsuariosModal from "../../components/ListaUsuariosModal";
import MetaLeituraCard from "../../components/MetaLeituraCard";
import PerfilLivroModal, { type LivroPerfilItem } from "../../components/PerfilLivroModal";
import PostCard from "../../components/PostCard";
import SeletorPilula from "../../components/SeletorPilula";

type UsuarioPublico = PerfilCacheUsuario;

type AbaPerfil = "avaliacoes" | "diario" | "livros";
type ListaPerfil = "seguidores" | "seguindo" | null;

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

function normalizarUsuarioLista(raw: unknown): UsuarioPublico {
    const u = (raw ?? {}) as UsuarioPublico & { image_url?: string };
    return {
        ...u,
        image: u.image || u.image_url || undefined,
    };
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
        const avaliacao = (item ?? {}) as Partial<AvaliacaoFeed> & {
            avaliacao?: Partial<AvaliacaoFeed>;
        };
        const dados = avaliacao.avaliacao ?? avaliacao;
        const usuarioOriginal = dados.usuario ?? avaliacao.usuario;
        const livroID = extrairLivroID(dados as Partial<AvaliacaoFeed> & { livro_id?: number });
        const livroDoMapa = livroID > 0 ? livrosPorID.get(livroID) : undefined;
        const livroOriginal = dados.livro ?? avaliacao.livro;

        return {
            id: Number(dados.id ?? avaliacao.id ?? 0),
            nota: Number(dados.nota ?? avaliacao.nota ?? 0),
            texto: dados.texto ?? avaliacao.texto ?? "",
            contem_spoiler: avaliacaoTemSpoiler(dados.contem_spoiler ?? avaliacao.contem_spoiler),
            anexo_url: dados.anexo_url ?? avaliacao.anexo_url,
            criado_em: dados.criado_em ?? avaliacao.criado_em ?? new Date().toISOString(),
            usuario: {
                id: Number(usuarioOriginal?.id ?? perfil.id ?? 0),
                nome: usuarioOriginal?.nome || perfil.nome || "Usuário",
                nick: usuarioOriginal?.nick || perfil.nick || nickRota,
                image: usuarioOriginal?.image || perfil.image,
                // Sem esses campos, AvatarUsuario bloqueia GIF (trata como não-Pro).
                assinaturaId: usuarioOriginal?.assinaturaId ?? perfil.assinaturaId,
                temPlanoTop: usuarioOriginal?.temPlanoTop ?? perfil.plano?.temPlanoTop,
                temPlanoPro: usuarioOriginal?.temPlanoPro ?? perfil.plano?.temPlanoPro,
                rankConfiabilidade:
                    usuarioOriginal?.rankConfiabilidade ?? perfil.rankConfiabilidade ?? 0,
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

function estanteParaPerfil(item: EstanteItem): LivroPerfilItem {
    return {
        id: item.livro.id,
        titulo: item.livro.titulo,
        autor: item.livro.autor,
        capa_url: item.livro.capa_url,
        paginas: item.livro.paginas,
        porcentagem: item.porcentagem_atual,
        status: item.status,
        temAvaliacao: item.tem_avaliacao,
    };
}

export default function PerfilNickPage() {
    const router = useRouter();
    const params = useParams<{ nick: string }>();
    const { data: session } = useSession();
    const { exigirAuth } = useAuthGate();

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
    const [estatisticas, setEstatisticas] = useState<EstatisticasLeituraResposta | null>(null);
    const [carregandoEstatisticas, setCarregandoEstatisticas] = useState(false);
    const [upgradeHistoricoAberto, setUpgradeHistoricoAberto] = useState(false);
    const [carregando, setCarregando] = useState(true);
    const [alternandoFollow, setAlternandoFollow] = useState(false);
    const [erro, setErro] = useState("");
    const [abaAtiva, setAbaAtiva] = useState<AbaPerfil>("avaliacoes");
    const [livroModalAberto, setLivroModalAberto] = useState(false);
    const [livroSelecionadoId, setLivroSelecionadoId] = useState<number | null>(null);
    const [atualizandoStatusLivro, setAtualizandoStatusLivro] = useState(false);
    const [removendoLivro, setRemovendoLivro] = useState(false);
    const [estante, setEstante] = useState<EstanteItem[]>([]);
    const [carregandoEstante, setCarregandoEstante] = useState(false);
    const [filtroStatusLivros, setFiltroStatusLivros] = useState<StatusEstante | "todos">("todos");
    const [adicionarLivroAberto, setAdicionarLivroAberto] = useState(false);
    const [menuOpcoesAberto, setMenuOpcoesAberto] = useState(false);
    const [alterarNickAberto, setAlterarNickAberto] = useState(false);
    const [listaAberta, setListaAberta] = useState<ListaPerfil>(null);
    const [denunciarPerfilAberto, setDenunciarPerfilAberto] = useState(false);
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

    const livros = useMemo(() => estante.map(estanteParaPerfil), [estante]);

    const livrosFiltrados = useMemo(() => {
        if (filtroStatusLivros === "todos") {
            return livros;
        }
        return livros.filter((livro) => livro.status === filtroStatusLivros);
    }, [livros, filtroStatusLivros]);

    const contagemPorStatus = useMemo(() => {
        const contagem: Record<StatusEstante, number> = { quero_ler: 0, lendo: 0, lido: 0 };
        for (const livro of livros) {
            contagem[livro.status] += 1;
        }
        return contagem;
    }, [livros]);

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

    const carregarEstante = useCallback(async (nickAlvo: string) => {
        setCarregandoEstante(true);
        try {
            const res = await fetch(`/api/usuarios/${encodeURIComponent(nickAlvo)}/estante`);
            if (!res.ok) {
                setEstante([]);
                return;
            }
            const data = (await res.json()) as EstanteResposta;
            setEstante(Array.isArray(data.livros) ? data.livros : []);
        } catch {
            setEstante([]);
        } finally {
            setCarregandoEstante(false);
        }
    }, []);

    const carregarEstatisticas = useCallback(async (nickAlvo: string) => {
        if (!session?.accessToken) {
            setEstatisticas(null);
            return;
        }
        setCarregandoEstatisticas(true);
        try {
            const res = await fetch(`/api/diario/${encodeURIComponent(nickAlvo)}/estatisticas`);
            if (!res.ok) {
                setEstatisticas(null);
                return;
            }
            const data = (await res.json()) as EstatisticasLeituraResposta;
            setEstatisticas(data);
            const cache = getPerfilCache(nickAlvo);
            if (cache) {
                updatePerfilCache(nickAlvo, { estatisticas: data });
            }
        } catch {
            setEstatisticas(null);
        } finally {
            setCarregandoEstatisticas(false);
        }
    }, [session?.accessToken]);

    const carregarDados = useCallback(async () => {
        if (!nick) {
            setCarregando(false);
            return;
        }

        setCarregando(true);
        setErro("");

        const cache = getPerfilCache(nick);
        if (cache) {
            setPerfil(cache.perfil);
            setAvaliacoes(cache.avaliacoes);
            setSeguidores(cache.seguidores.map(normalizarUsuarioLista));
            setSeguindo(cache.seguindo.map(normalizarUsuarioLista));
            setDiario(cache.diario);
            setHistorico(cache.historico);
            setEstatisticas(cache.estatisticas ?? null);
            setCarregando(false);
            void carregarEstatisticas(nick);
            void carregarEstante(nick);
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

            const perfilData = dataPerfil as UsuarioPublico;

            if (perfilData.contaApagada || perfilData.perfilPrivado) {
                setPerfil(perfilData);
                setAvaliacoes([]);
                setSeguidores([]);
                setSeguindo([]);
                setDiario(null);
                setHistorico(historicoVazio);
                return;
            }

            if (!resAvaliacoes.ok && resAvaliacoes.status !== 403) {
                setErro(dataAvaliacoes.erro || "Não foi possível carregar as avaliações.");
                return;
            }

            if (!resSeguidores.ok && resSeguidores.status !== 401) {
                setErro(dataSeguidores.erro || "Não foi possível carregar os seguidores.");
                return;
            }

            if (!resSeguindo.ok && resSeguindo.status !== 401) {
                setErro(dataSeguindo.erro || "Não foi possível carregar a lista de seguindo.");
                return;
            }

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
                            if (hasLivroCache(livroID)) {
                                return { livroID, livro: getLivroCache(livroID)! };
                            }
                            const resLivro = await fetch(`/api/livros/${livroID}`);
                            if (!resLivro.ok) {
                                return null;
                            }
                            const livro = (await resLivro.json()) as LivroPublico;
                            setLivroCache(livroID, livro);
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
            const seguidoresData = Array.isArray(dataSeguidores)
                ? dataSeguidores.map(normalizarUsuarioLista)
                : [];
            const seguindoData = Array.isArray(dataSeguindo)
                ? dataSeguindo.map(normalizarUsuarioLista)
                : [];

            setPerfil(perfilData);
            setAvaliacoes(avaliacoesNorm);
            setSeguidores(seguidoresData);
            setSeguindo(seguindoData);
            setDiario(diarioData);
            setHistorico(historicoData);

            setPerfilCache(nick, {
                perfil: perfilData,
                avaliacoes: avaliacoesNorm,
                seguidores: seguidoresData,
                seguindo: seguindoData,
                diario: diarioData,
                historico: historicoData,
                estatisticas: null,
            });

            void carregarEstatisticas(nick);
            void carregarEstante(nick);
        } catch {
            setErro("Não foi possível carregar o perfil.");
        } finally {
            setCarregando(false);
        }
    }, [nick, carregarEstatisticas, carregarEstante]);

    useEffect(() => {
        carregarDados();
    }, [carregarDados]);

    useEffect(() => {
        if (abaAtiva === "diario" && nick && session?.accessToken && !estatisticas && !carregandoEstatisticas) {
            void carregarEstatisticas(nick);
        }
    }, [abaAtiva, nick, session?.accessToken, estatisticas, carregandoEstatisticas, carregarEstatisticas]);

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
        if (!exigirAuth()) {
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

            deletePerfilCache(nick);
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
            deletePerfilCache(nick);
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

        try {
            const res = await fetch(
                `/api/usuarios/${encodeURIComponent(nick)}/estante/${livroSelecionado.id}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status }),
                },
            );

            const data = await res.json().catch(() => null);
            if (!res.ok) {
                setErro(data?.erro || "Não foi possível atualizar o status do livro.");
                return;
            }

            deletePerfilCache(nick);
            await Promise.all([carregarDados(), carregarEstante(nick)]);
        } catch {
            setErro("Não foi possível atualizar o status do livro.");
        } finally {
            setAtualizandoStatusLivro(false);
        }
    }

    async function removerDaEstante() {
        if (!ehMeuPerfil || !livroSelecionado) {
            return;
        }

        setRemovendoLivro(true);
        setErro("");

        try {
            const res = await fetch(
                `/api/usuarios/${encodeURIComponent(nick)}/estante/${livroSelecionado.id}`,
                { method: "DELETE" },
            );
            const data = await res.json().catch(() => null);
            if (!res.ok) {
                setErro(data?.erro || "Não foi possível remover o livro.");
                return;
            }

            setLivroModalAberto(false);
            setLivroSelecionadoId(null);
            deletePerfilCache(nick);
            await carregarEstante(nick);
        } catch {
            setErro("Não foi possível remover o livro.");
        } finally {
            setRemovendoLivro(false);
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

    if (perfil.contaApagada) {
        return (
            <Box className="flex flex-col items-center gap-3 py-10 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-cinza-200 font-gabarito-bold text-2xl text-cinza-600">
                    ?
                </div>
                <h1 className="font-gabarito-bold text-2xl text-azul-900">Conta apagada</h1>
                <p className="font-gabarito-regular text-cinza-700">
                    Este usuário desativou a conta.
                </p>
            </Box>
        );
    }

    if (perfil.perfilPrivado && !ehMeuPerfil) {
        return (
            <Box className="flex flex-col items-center gap-4 py-10 text-center">
                <AvatarUsuario image={perfil.image} nome={perfil.nome} nick={perfil.nick} size={96} className="h-24 w-24" />
                <h1 className="font-gabarito-bold text-2xl text-azul-900">@{perfil.nick}</h1>
                <p className="font-gabarito-regular text-cinza-700">Este perfil é privado.</p>
                <p className="max-w-sm font-gabarito-regular text-sm text-cinza-600">
                    Siga esta conta para ver avaliações e histórico de leitura.
                </p>
                <button
                    type="button"
                    disabled={alternandoFollow || sigoPerfil}
                    onClick={() => {
                        if (!exigirAuth()) return;
                        void (async () => {
                            setAlternandoFollow(true);
                            try {
                                const res = await fetch(
                                    `/api/usuarios/${encodeURIComponent(nick)}/${sigoPerfil ? "deixar-de-seguir" : "seguir"}`,
                                    { method: "POST" },
                                );
                                if (!res.ok && res.status !== 204) {
                                    setErro("Não foi possível seguir.");
                                    return;
                                }
                                deletePerfilCache(nick);
                                await carregarDados();
                            } finally {
                                setAlternandoFollow(false);
                            }
                        })();
                    }}
                    className="flex items-center gap-2 rounded-full bg-azul-600 px-5 py-2 font-gabarito-bold text-sm text-white hover:bg-azul-700 disabled:opacity-60"
                >
                    {sigoPerfil ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                    {sigoPerfil ? "Seguindo" : "Seguir"}
                </button>
            </Box>
        );
    }

    const inicial = perfil.nome?.charAt(0).toUpperCase() || perfil.nick.charAt(0).toUpperCase();

    return (
        <div className="flex flex-col gap-4">
            <Box className="overflow-hidden p-0">
                <div className="flex items-center justify-between gap-2 py-2">
                    <div className="flex min-w-0 items-center">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="shrink-0 rounded-full p-1 text-azul-900 transition hover:bg-background"
                            aria-label="Voltar"
                        >
                            <ChevronLeft className="h-7 w-7" />
                        </button>
                        <h1 className="truncate font-gabarito-bold text-xl text-azul-900 sm:text-2xl">
                            {perfil.nick.charAt(0).toUpperCase() + perfil.nick.slice(1)}
                        </h1>
                    </div>

                    {ehMeuPerfil && (
                        <div ref={menuOpcoesRef} className="relative shrink-0">
                            <button
                                type="button"
                                onClick={() => setMenuOpcoesAberto((estado) => !estado)}
                                className="rounded-full p-2 text-azul-900 transition hover:bg-background"
                                aria-label="Opções do perfil"
                                aria-expanded={menuOpcoesAberto}
                            >
                                <MoreVertical className="h-5 w-5" />
                            </button>
                            {menuOpcoesAberto && (
                                <div className="absolute right-0 top-full z-10 mt-1 min-w-40 rounded-xl border border-gray-200 bg-white p-1 shadow-lg">
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

                <BannerPerfil
                    nome={perfil.nome}
                    nick={perfil.nick}
                    email={perfil.email ?? session?.user?.email ?? ""}
                    image={perfil.image}
                    banner={perfil.banner}
                    bannerPosicao={perfil.bannerPosicao}
                    editavel={ehMeuPerfil}
                    onAtualizado={({ banner: novoBanner, bannerPosicao: novaPosicao }) => {
                        setPerfil((atual) =>
                            atual
                                ? {
                                      ...atual,
                                      ...(novoBanner !== undefined ? { banner: novoBanner } : {}),
                                      ...(novaPosicao !== undefined ? { bannerPosicao: novaPosicao } : {}),
                                  }
                                : atual,
                        );
                        deletePerfilCache(nick);
                    }}
                />

                <div className="px-4 py-4">
                    <div className="relative z-10 -mt-12 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div className="flex min-w-0 flex-1 gap-2">
                            {ehMeuPerfil ? (
                                <AvatarPerfilEditavel
                                    nome={perfil.nome}
                                    nick={perfil.nick}
                                    email={perfil.email ?? session?.user?.email ?? ""}
                                    image={perfil.image}
                                    banner={perfil.banner}
                                    bannerPosicao={perfil.bannerPosicao}
                                    onAtualizado={(novaImage) => {
                                        setPerfil((atual) => (atual ? { ...atual, image: novaImage } : atual));
                                        deletePerfilCache(nick);
                                    }}
                                />
                            ) : (
                                <AvatarUsuario
                                    image={perfil.image}
                                    nome={perfil.nome}
                                    nick={perfil.nick}
                                    assinaturaId={perfil.assinaturaId}
                                    plano={perfil.plano}
                                    temPlanoPro={perfil.plano?.temPlanoPro}
                                    size={96}
                                    className="h-24 w-24 shrink-0 border-4 border-white"
                                    inicialClassName="text-3xl"
                                />
                            )}
                            <div className="mt-auto min-w-0">
                                <p className="flex min-w-0 flex-wrap items-center gap-1.5 font-gabarito-bold text-xl text-azul-900">
                                    <span className="truncate">{perfil.nick}</span>
                                    <BadgeTop plano={perfil.plano} assinaturaId={perfil.assinaturaId} />
                                    <BadgeRank rank={perfil.rankConfiabilidade} ocultarSeZero={false} />
                                </p>
                            </div>
                        </div>
                        {!ehMeuPerfil && (
                            <div className="flex shrink-0 flex-wrap items-center gap-2 pl-0 sm:justify-end sm:pl-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!exigirAuth()) return;
                                        setDenunciarPerfilAberto(true);
                                    }}
                                    aria-label="Denunciar perfil"
                                    className="flex items-center justify-center rounded-full border border-gray-300 p-2 font-gabarito-bold text-sm text-cinza-700 transition hover:bg-gray-50 sm:px-3 sm:py-2"
                                >
                                    <Flag className="h-4 w-4 shrink-0" />
                                    <span className="ml-1.5 hidden sm:inline">Denunciar</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!exigirAuth()) return;
                                        router.push(`/mensagens?novoChat=${perfil.id}`);
                                    }}
                                    aria-label="Mensagem"
                                    className="flex items-center justify-center gap-1.5 rounded-full border border-azul-600 p-2 font-gabarito-bold text-sm text-azul-600 transition hover:bg-azul-50 sm:px-4 sm:py-2"
                                >
                                    <Mail className="h-4 w-4 shrink-0" />
                                    <span className="hidden sm:inline">Mensagem</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={alternarFollow}
                                    disabled={alternandoFollow}
                                    aria-label={
                                        alternandoFollow
                                            ? "Atualizando"
                                            : sigoPerfil
                                              ? "Deixar de seguir"
                                              : "Seguir"
                                    }
                                    className={`flex items-center justify-center gap-1.5 rounded-full p-2 font-gabarito-bold text-sm transition sm:px-5 sm:py-2 ${
                                        sigoPerfil
                                            ? "border border-gray-400 bg-white text-cinza-700 hover:bg-gray-50"
                                            : "bg-azul-600 text-white hover:bg-azul-700"
                                    }`}
                                >
                                    {alternandoFollow ? (
                                        <>
                                            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                                            <span className="hidden sm:inline">Atualizando...</span>
                                        </>
                                    ) : sigoPerfil ? (
                                        <>
                                            <UserCheck className="h-4 w-4 shrink-0" />
                                            <span className="hidden sm:inline">Seguindo</span>
                                        </>
                                    ) : (
                                        <>
                                            <UserPlus className="h-4 w-4 shrink-0" />
                                            <span className="hidden sm:inline">Seguir</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>



                    <div className="mt-4 grid grid-cols-3 rounded-xl border border-gray-200 bg-white">
                        <div className="py-3 text-center">
                            <p className="font-gabarito-bold text-2xl text-azul-600">{avaliacoes.length}</p>
                            <p className="font-gabarito-regular text-xs text-cinza-700">Avaliações</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setListaAberta("seguidores")}
                            className="cursor-pointer border-x border-gray-200 py-3 text-center transition hover:bg-background active:bg-background"
                        >
                            <p className="font-gabarito-bold text-2xl text-azul-600">{seguidores.length}</p>
                            <p className="font-gabarito-regular text-xs text-cinza-700">Seguidores</p>
                        </button>
                        <button
                            type="button"
                            onClick={() => setListaAberta("seguindo")}
                            className="cursor-pointer py-3 text-center transition hover:bg-background active:bg-background"
                        >
                            <p className="font-gabarito-bold text-2xl text-azul-600">{seguindo.length}</p>
                            <p className="font-gabarito-regular text-xs text-cinza-700">Seguindo</p>
                        </button>
                    </div>
                </div>
            </Box>

            <SeletorPilula
                className="mb-1"
                valor={abaAtiva}
                onChange={setAbaAtiva}
                opcoes={[
                    { valor: "avaliacoes", rotulo: "Avaliações" },
                    {
                        valor: "diario",
                        rotulo: (
                            <>
                                Registro
                                <span className="hidden sm:inline"> de Leitura</span>
                            </>
                        ),
                    },
                    { valor: "livros", rotulo: "Livros" },
                ]}
            />

            {abaAtiva === "avaliacoes" && (
                <>
                    {avaliacoes.length === 0 ? (
                        <Box className="text-center">
                            <p className="font-gabarito-bold text-xl text-azul-900">Nenhuma avaliação ainda</p>
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
                                onRemovido={(id) => setAvaliacoes((lista) => lista.filter((a) => a.id !== id))}
                                onAtualizado={(id, dados) => {
                                    setAvaliacoes((lista) =>
                                        lista.map((a) =>
                                            a.id === id ? { ...a, nota: dados.nota, texto: dados.texto } : a,
                                        ),
                                    );
                                }}
                            />
                        ))
                    )}
                </>
            )}

            {abaAtiva === "diario" && (
                <Box className="flex flex-col gap-5">
                    <EstatisticasLeitura
                        stats={estatisticas}
                        carregando={carregandoEstatisticas}
                        ehMeuPerfil={ehMeuPerfil}
                    />

                    {ehMeuPerfil ? <MetaLeituraCard /> : null}

                    <div className="flex min-w-0 items-center justify-between gap-2">
                        <h2 className="truncate font-gabarito-bold text-lg text-azul-900 sm:text-xl">Semana de leitura</h2>
                        <p className="shrink-0 font-gabarito-bold text-lg text-[#ed2d00] sm:text-xl">
                            {diario?.sequencia_atual ?? 0} <span className="text-xl sm:text-2xl">🔥</span>
                        </p>
                    </div>

                    <div className="grid w-full min-w-0 grid-cols-7 gap-1 sm:gap-2 md:gap-3">
                        {semanaExpandida.map((dia, index) => (
                            <div key={`${dia.dia}-${index}`} className="flex min-w-0 flex-col items-center gap-1 sm:gap-2">
                                <div
                                    className={`flex aspect-square w-full max-w-12 items-center justify-center rounded-full ${dia.leu ? "bg-azul-800" : "bg-azul-200"
                                        }`}
                                >
                                    <Book className={`h-4 w-4 sm:h-5 sm:w-5 ${dia.leu ? "text-azul-200" : "text-azul-400"}`} />
                                </div>
                                <p className={`font-gabarito-bold text-xs sm:text-sm ${dia.leu ? "text-azul-800" : "text-azul-400"}`}>
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
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <h2 className="font-gabarito-bold text-xl text-azul-900">Minha estante</h2>
                        {ehMeuPerfil && (
                            <button
                                type="button"
                                onClick={() => setAdicionarLivroAberto(true)}
                                className="flex items-center gap-1.5 rounded-full bg-azul-600 px-4 py-2 font-gabarito-bold text-sm text-white hover:bg-azul-700"
                            >
                                <Plus className="h-4 w-4" />
                                Adicionar livro
                            </button>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => setFiltroStatusLivros("todos")}
                            className={`rounded-full px-3 py-1 font-gabarito-bold text-xs transition ${
                                filtroStatusLivros === "todos"
                                    ? "bg-azul-600 text-white"
                                    : "bg-gray-200 text-cinza-700 hover:bg-gray-300"
                            }`}
                        >
                            Todos ({livros.length})
                        </button>
                        {(["quero_ler", "lendo", "lido"] as StatusEstante[]).map((status) => (
                            <button
                                key={status}
                                type="button"
                                onClick={() => setFiltroStatusLivros(status)}
                                className={`rounded-full px-3 py-1 font-gabarito-bold text-xs transition ${
                                    filtroStatusLivros === status
                                        ? "bg-azul-600 text-white"
                                        : "bg-gray-200 text-cinza-700 hover:bg-gray-300"
                                }`}
                            >
                                {ROTULOS_STATUS_ESTANTE[status]} ({contagemPorStatus[status]})
                            </button>
                        ))}
                    </div>

                    {carregandoEstante ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-azul-600" />
                        </div>
                    ) : livrosFiltrados.length === 0 ? (
                        <p className="font-gabarito-regular text-cinza-700">
                            {livros.length === 0
                                ? "Nenhum livro na estante ainda."
                                : "Nenhum livro com este status."}
                        </p>
                    ) : (
                        <div className="grid grid-cols-3 items-stretch gap-4 sm:grid-cols-4">
                            {livrosFiltrados.map((livro) => (
                                <button
                                    key={`${livro.id}-${livro.titulo}`}
                                    type="button"
                                    onClick={() => {
                                        setLivroSelecionadoId(livro.id);
                                        setLivroModalAberto(true);
                                    }}
                                    className="group flex h-full flex-col gap-2 rounded-xl bg-background p-2 text-left transition hover:-translate-y-0.5 hover:shadow-md"
                                >
                                    {mediaUrl(livro.capa_url) ? (
                                        <Image
                                            src={mediaUrl(livro.capa_url)!}
                                            alt={livro.titulo}
                                            width={120}
                                            height={180}
                                            className="h-40 w-full shrink-0 rounded-lg object-cover"
                                            unoptimized
                                        />
                                    ) : (
                                        <div className="flex h-40 w-full shrink-0 items-center justify-center rounded-lg bg-azul-200 text-3xl">
                                            📖
                                        </div>
                                    )}
                                    <p className="min-h-8 overflow-hidden font-gabarito-bold text-xs leading-4 text-azul-900 line-clamp-2">
                                        {livro.titulo}
                                    </p>
                                    <p
                                        className={`shrink-0 rounded-full px-2 py-1 text-center font-gabarito-bold text-[10px] ${
                                            livro.status === "lido"
                                                ? "bg-green-100 text-green-700"
                                                : livro.status === "lendo"
                                                  ? "bg-amber-100 text-amber-700"
                                                  : "bg-gray-200 text-cinza-700"
                                        }`}
                                    >
                                        {ROTULOS_STATUS_ESTANTE[livro.status]}
                                    </p>
                                    <p className="min-h-[1.25rem] shrink-0 font-gabarito-bold text-[11px] leading-5 text-azul-600">
                                        {livro.porcentagem > 0 ? `${Math.round(livro.porcentagem)}%` : null}
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
                podeRemover={ehMeuPerfil && !avaliacaoLivroSelecionado}
                removendo={removendoLivro}
                onRemover={removerDaEstante}
            />

            {ehMeuPerfil && (
                <AdicionarLivroEstanteModal
                    open={adicionarLivroAberto}
                    onClose={() => setAdicionarLivroAberto(false)}
                    nick={nick}
                    onAdicionado={() => void carregarEstante(nick)}
                />
            )}

            <AlterarNickModal
                open={alterarNickAberto}
                onClose={() => setAlterarNickAberto(false)}
                nickAtual={perfil.nick}
                nome={perfil.nome}
                email={perfil.email ?? session?.user?.email ?? ""}
                image={perfil.image}
                banner={perfil.banner}
                bannerPosicao={perfil.bannerPosicao}
                onSalvo={(novoNick) => {
                    deletePerfilCache(nick);
                    deletePerfilCache(novoNick);
                    if (novoNick !== nick) {
                        router.replace(`/perfil/${encodeURIComponent(novoNick)}`);
                    } else {
                        setPerfil((atual) => (atual ? { ...atual, nick: novoNick } : atual));
                    }
                }}
            />

            <ListaUsuariosModal
                open={listaAberta === "seguidores"}
                onClose={() => setListaAberta(null)}
                titulo="Seguidores"
                usuarios={seguidores}
                vazio="Ainda não há seguidores por aqui."
            />

            <ListaUsuariosModal
                open={listaAberta === "seguindo"}
                onClose={() => setListaAberta(null)}
                titulo="Seguindo"
                usuarios={seguindo}
                vazio="Ainda não segue ninguém."
            />

            {perfil && (
                <DenunciarModal
                    open={denunciarPerfilAberto}
                    onClose={() => setDenunciarPerfilAberto(false)}
                    tipoEntidade="usuario"
                    referenciaId={perfil.id}
                    titulo="Denunciar perfil"
                />
            )}

            <PlanoUpgradeModal
                open={upgradeHistoricoAberto}
                onClose={() => setUpgradeHistoricoAberto(false)}
                recurso="historicoLeitura"
            />
        </div>
    );
}
