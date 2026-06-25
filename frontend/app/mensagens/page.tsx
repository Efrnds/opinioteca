"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { mediaUrl } from "@/lib/media";
import { parseNovaMensagem, type WsConversaLidaPayload, type WsMensagemApagadaPayload, type WsMensagemAtualizadaPayload } from "@/lib/ws/types";
import type { ConversaResumo, Mensagem, MensagemResumo } from "@/types/mensagem";
import type { PesquisaResultado, PesquisaUsuario } from "@/types/pesquisa";
import EmojiPicker, { type EmojiClickData } from "emoji-picker-react";
import {
    ImageIcon,
    Loader2,
    MoreHorizontal,
    Pencil,
    Plus,
    Reply,
    Search,
    Send,
    Smile,
    Trash2,
    User,
    X,
} from "lucide-react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
    ChangeEvent,
    ClipboardEvent,
    FormEvent,
    Suspense,
    useCallback,
    useEffect,
    useId,
    useMemo,
    useRef,
    useState,
} from "react";
import Box from "../components/Box";
import { useWebSocket } from "../components/WebSocketProvider";

type UsuarioMinimo = {
    id: number;
    nome: string;
    nick: string;
    image?: string;
};

type GiphyGif = {
    id: string;
    images: {
        fixed_height: { url: string };
        original: { url: string };
    };
};

const REACOES = ["👍", "❤️", "😂", "😮", "😢", "🔥"] as const;

function textoResumo(msg: MensagemResumo) {
    if (msg.conteudo?.trim()) return msg.conteudo;
    if (msg.anexo_url) return "📷 Imagem";
    return "Mensagem";
}

function renderConteudoMensagem(conteudo: string, minha: boolean) {
    const partes = conteudo.split(/(https?:\/\/[^\s]+)/);
    return partes.map((parte, i) =>
        /^https?:\/\//.test(parte) ? (
            <a
                key={i}
                href={parte}
                target="_blank"
                rel="noopener noreferrer"
                className={`break-all whitespace-pre-wrap underline ${minha ? "text-white" : "text-azul-700"}`}
            >
                {parte}
            </a>
        ) : (
            <span key={i} className="whitespace-pre-wrap">
                {parte}
            </span>
        ),
    );
}

function conversaVazia(usuario: UsuarioMinimo): ConversaResumo {
    return {
        usuario_id: usuario.id,
        nome: usuario.nome,
        nick: usuario.nick,
        image: usuario.image,
        ultima_mensagem: "",
        ultima_mensagem_em: new Date(0).toISOString(),
        enviada_por_mim: false,
        fixada: false,
        nao_lidas: 0,
    };
}

function previewMensagem(msg: Mensagem) {
    if (msg.conteudo?.trim()) return msg.conteudo.trim();
    if (msg.anexo_url) return "📷 Imagem";
    return "Mensagem";
}

function reordenarConversas(lista: ConversaResumo[]) {
    return [...lista].sort((a, b) => {
        if (a.fixada !== b.fixada) return a.fixada ? -1 : 1;
        return new Date(b.ultima_mensagem_em).getTime() - new Date(a.ultima_mensagem_em).getTime();
    });
}

function outroIdDaMensagem(msg: Mensagem, meuID: number) {
    return msg.remetente_id === meuID ? msg.destinatario_id : msg.remetente_id;
}

function mensagemVisivelParaUsuario(msg: Mensagem, usuarioId: number) {
    if (msg.remetente_id === usuarioId && msg.apagado_por_remetente) return false;
    if (msg.destinatario_id === usuarioId && msg.apagado_por_destinatario) return false;
    return true;
}

function mensagemPertenceAoChat(msg: Pick<Mensagem, "remetente_id" | "destinatario_id">, chatOutroId: number) {
    return msg.remetente_id === chatOutroId || msg.destinatario_id === chatOutroId;
}

function mesmoInstante(a?: string, b?: string) {
    if (!a || !b) return false;
    return new Date(a).getTime() === new Date(b).getTime();
}

function previewAPartirDoHistorico(mensagens: Mensagem[], meuID: number) {
    const visiveis = mensagens.filter(m => mensagemVisivelParaUsuario(m, meuID));
    const ultima = visiveis[visiveis.length - 1];
    if (!ultima) {
        return { ultima_mensagem: "", ultima_mensagem_em: new Date(0).toISOString(), enviada_por_mim: false };
    }
    return {
        ultima_mensagem: previewMensagem(ultima),
        ultima_mensagem_em: ultima.criado_em,
        enviada_por_mim: ultima.remetente_id === meuID,
    };
}

function MensagensConteudo() {
    const { data: session } = useSession();
    const searchParams = useSearchParams();
    const { subscribe, setChatAtivo: setChatAtivoWS, recarregarMensagensNaoLidas } = useWebSocket();
    const meuID = Number(session?.user?.id || 0);

    const [conversas, setConversas] = useState<ConversaResumo[]>([]);
    const [chatAtivo, setChatAtivo] = useState<number | null>(null);
    const [mensagens, setMensagens] = useState<Mensagem[]>([]);
    const [texto, setTexto] = useState("");
    const [termoBusca, setTermoBusca] = useState("");
    const [carregandoInbox, setCarregandoInbox] = useState(true);
    const [carregandoChat, setCarregandoChat] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const [arquivoImagem, setArquivoImagem] = useState<File | null>(null);
    const [previewImagem, setPreviewImagem] = useState<string | null>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showGifPicker, setShowGifPicker] = useState(false);
    const [termoGifBusca, setTermoGifBusca] = useState("");
    const [gifsGiphy, setGifsGiphy] = useState<GiphyGif[]>([]);
    const [buscandoGifs, setBuscandoGifs] = useState(false);
    const [modalAberto, setModalAberto] = useState(false);
    const [termoModal, setTermoModal] = useState("");
    const [usuariosModal, setUsuariosModal] = useState<PesquisaUsuario[]>([]);
    const [buscandoModal, setBuscandoModal] = useState(false);
    const [respostaA, setRespostaA] = useState<Mensagem | null>(null);
    const [editandoId, setEditandoId] = useState<number | null>(null);
    const [editandoTexto, setEditandoTexto] = useState("");
    const [reacaoMsgId, setReacaoMsgId] = useState<number | null>(null);
    const fimRef = useRef<HTMLDivElement>(null);
    const inputRodapeRef = useRef<HTMLDivElement>(null);
    const chatAtivoRef = useRef<number | null>(null);
    const novoChatProcessado = useRef<string | null>(null);
    const carregarInboxRef = useRef<() => Promise<void>>(async () => {});
    const inputImagemId = useId();

    chatAtivoRef.current = chatAtivo;

    const conversaAtiva = conversas.find(c => c.usuario_id === chatAtivo) ?? null;

    const conversasFiltradas = useMemo(() => {
        const t = termoBusca.trim().toLowerCase();
        if (!t) return conversas;
        return conversas.filter(c => c.nome.toLowerCase().includes(t) || c.nick.toLowerCase().includes(t));
    }, [conversas, termoBusca]);

    const garantirConversaNaLista = useCallback((usuario: UsuarioMinimo) => {
        setConversas(atual => {
            if (atual.some(c => c.usuario_id === usuario.id)) return atual;
            return [conversaVazia(usuario), ...atual];
        });
    }, []);

    const abrirChatComUsuario = useCallback(
        (usuario: UsuarioMinimo) => {
            if (usuario.id === meuID) return;
            garantirConversaNaLista(usuario);
            setChatAtivo(usuario.id);
        },
        [garantirConversaNaLista, meuID],
    );

    const carregarInbox = useCallback(async () => {
        setCarregandoInbox(true);
        try {
            const res = await fetch("/api/mensagens");
            if (res.ok) {
                setConversas((await res.json()) as ConversaResumo[]);
            }
        } finally {
            setCarregandoInbox(false);
        }
    }, []);

    carregarInboxRef.current = carregarInbox;

    const carregarHistorico = useCallback(
        async (usuarioId: number) => {
            setCarregandoChat(true);
            try {
                const res = await fetch(`/api/mensagens/${usuarioId}`);
                if (res.ok) {
                    setMensagens((await res.json()) as Mensagem[]);
                    await recarregarMensagensNaoLidas();
                }
            } finally {
                setCarregandoChat(false);
            }
        },
        [recarregarMensagensNaoLidas],
    );

    const buscarUsuarioPorID = useCallback(async (id: number): Promise<UsuarioMinimo | null> => {
        const res = await fetch(`/api/usuarios/id/${id}`);
        if (!res.ok) return null;
        const u = (await res.json()) as UsuarioMinimo;
        return u?.id ? u : null;
    }, []);

    useEffect(() => {
        setChatAtivoWS(chatAtivo);
    }, [chatAtivo, setChatAtivoWS]);

    useEffect(() => {
        return () => setChatAtivoWS(null);
    }, [setChatAtivoWS]);

    const marcarMensagemLida = useCallback((mensagemId: number) => {
        fetch(`/api/mensagens/msg/${mensagemId}/ler`, { method: "PUT" }).catch(() => {});
    }, []);

    const limparInteracoesMensagem = useCallback((mensagemId: number) => {
        setRespostaA(atual => (atual?.id === mensagemId ? null : atual));
        setEditandoId(atual => {
            if (atual === mensagemId) {
                setEditandoTexto("");
            }
            return atual === mensagemId ? null : atual;
        });
        setReacaoMsgId(atual => (atual === mensagemId ? null : atual));
    }, []);

    const removerMensagemInvalida = useCallback(
        (mensagemId: number) => {
            setMensagens(atual => atual.filter(m => m.id !== mensagemId));
            limparInteracoesMensagem(mensagemId);
        },
        [limparInteracoesMensagem],
    );

    useEffect(() => {
        return subscribe((tipo, payload) => {
            if (tipo === "NOVA_MENSAGEM") {
                const parsed = parseNovaMensagem(payload);
                if (!parsed) return;

                const { mensagem, nao_lidas_conversa } = parsed;
                const outroId = outroIdDaMensagem(mensagem, meuID);
                const chatAtual = chatAtivoRef.current;
                const emChatAtivo =
                    chatAtual != null &&
                    (mensagem.remetente_id === chatAtual || mensagem.destinatario_id === chatAtual);

                setConversas(atual => {
                    const existente = atual.find(c => c.usuario_id === outroId);
                    const atualizada: ConversaResumo = {
                        usuario_id: outroId,
                        nome: existente?.nome ?? "Usuário",
                        nick: existente?.nick ?? "",
                        image: existente?.image,
                        ultima_mensagem: previewMensagem(mensagem),
                        ultima_mensagem_em: mensagem.criado_em,
                        enviada_por_mim: mensagem.remetente_id === meuID,
                        fixada: existente?.fixada ?? false,
                        nao_lidas: emChatAtivo ? 0 : nao_lidas_conversa,
                    };
                    const restantes = atual.filter(c => c.usuario_id !== outroId);
                    return reordenarConversas([atualizada, ...restantes]);
                });

                if (emChatAtivo && mensagem.remetente_id !== meuID) {
                    setMensagens(atual => {
                        if (atual.some(m => m.id === mensagem.id)) return atual;
                        return [...atual, mensagem];
                    });
                    marcarMensagemLida(mensagem.id);
                }
                return;
            }

            if (tipo === "CONVERSA_LIDA") {
                const p = payload as WsConversaLidaPayload;
                setConversas(atual =>
                    atual.map(c => (c.usuario_id === p.usuario_id ? { ...c, nao_lidas: p.nao_lidas_conversa } : c)),
                );
                return;
            }

            if (tipo === "MENSAGEM_ATUALIZADA") {
                const p = payload as WsMensagemAtualizadaPayload;
                const outroId = outroIdDaMensagem(p.mensagem, meuID);
                const chatAtual = chatAtivoRef.current;
                const emChatAtivo =
                    chatAtual != null && mensagemPertenceAoChat(p.mensagem, chatAtual);

                if (emChatAtivo) {
                    setMensagens(atual =>
                        atual.map(m => (m.id === p.mensagem.id ? { ...m, ...p.mensagem } : m)),
                    );
                }

                setConversas(atual =>
                    atual.map(c => {
                        if (c.usuario_id !== outroId) return c;
                        if (!mesmoInstante(c.ultima_mensagem_em, p.mensagem.criado_em)) return c;
                        return {
                            ...c,
                            ultima_mensagem: previewMensagem(p.mensagem),
                            enviada_por_mim: p.mensagem.remetente_id === meuID,
                        };
                    }),
                );
                return;
            }

            if (tipo === "MENSAGEM_APAGADA") {
                const p = payload as WsMensagemApagadaPayload;
                const outroId = p.remetente_id === meuID ? p.destinatario_id : p.remetente_id;
                const chatAtual = chatAtivoRef.current;
                const emChatAtivo = chatAtual != null && (p.remetente_id === chatAtual || p.destinatario_id === chatAtual);

                const flags = {
                    apagado_por_remetente: p.apagado_por_remetente,
                    apagado_por_destinatario: p.apagado_por_destinatario,
                };

                const apagadaParaMim =
                    (p.apagado_por_remetente && p.remetente_id === meuID) ||
                    (p.apagado_por_destinatario && p.destinatario_id === meuID);

                if (emChatAtivo) {
                    setMensagens(atual => {
                        const comFlags = atual.map(m => (m.id === p.mensagem_id ? { ...m, ...flags } : m));
                        const visiveis = comFlags.filter(m => mensagemVisivelParaUsuario(m, meuID));
                        const preview = previewAPartirDoHistorico(visiveis, meuID);
                        setConversas(conv =>
                            conv.map(c => (c.usuario_id === outroId ? { ...c, ...preview } : c)),
                        );
                        return visiveis;
                    });
                    if (apagadaParaMim) {
                        setRespostaA(atual => (atual?.id === p.mensagem_id ? null : atual));
                        setEditandoId(atual => (atual === p.mensagem_id ? null : atual));
                        setReacaoMsgId(atual => (atual === p.mensagem_id ? null : atual));
                    }
                } else {
                    const eraUltima = !!p.criado_em;
                    setConversas(atual =>
                        atual.map(c => {
                            if (c.usuario_id !== outroId) return c;
                            if (p.criado_em && !mesmoInstante(c.ultima_mensagem_em, p.criado_em)) return c;
                            if (!apagadaParaMim) return c;
                            return { ...c, ultima_mensagem: "Mensagem apagada" };
                        }),
                    );
                    if (eraUltima && apagadaParaMim) {
                        carregarInboxRef.current();
                    }
                }
            }
        });
    }, [subscribe, meuID, marcarMensagemLida]);

    useEffect(() => {
        carregarInbox();
    }, [carregarInbox]);

    useEffect(() => {
        if (carregandoInbox) return;

        const param = searchParams.get("novoChat");
        if (!param || param === novoChatProcessado.current) return;

        const id = Number(param);
        if (!id || id === meuID) return;

        novoChatProcessado.current = param;

        async function abrirNovoChat() {
            const existe = conversas.some(c => c.usuario_id === id);
            if (existe) {
                setChatAtivo(id);
                return;
            }

            const usuario = await buscarUsuarioPorID(id);
            if (usuario) {
                garantirConversaNaLista(usuario);
                setChatAtivo(usuario.id);
            }
        }

        abrirNovoChat();
    }, [searchParams, meuID, carregandoInbox, conversas, buscarUsuarioPorID, garantirConversaNaLista]);

    useEffect(() => {
        if (chatAtivo) {
            setConversas(atual => atual.map(c => (c.usuario_id === chatAtivo ? { ...c, nao_lidas: 0 } : c)));
            carregarHistorico(chatAtivo);
        } else {
            setMensagens([]);
        }
    }, [chatAtivo, carregarHistorico]);

    useEffect(() => {
        fimRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [mensagens]);

    useEffect(() => {
        if (!modalAberto) {
            setTermoModal("");
            setUsuariosModal([]);
            return;
        }

        if (!termoModal.trim()) {
            setUsuariosModal([]);
            return;
        }

        const timer = setTimeout(async () => {
            setBuscandoModal(true);
            try {
                const res = await fetch(`/api/pesquisa?q=${encodeURIComponent(termoModal.trim())}&limite=10`);
                if (res.ok) {
                    const data = (await res.json()) as PesquisaResultado;
                    setUsuariosModal(data.usuarios.filter(u => u.id !== meuID));
                } else {
                    setUsuariosModal([]);
                }
            } catch {
                setUsuariosModal([]);
            } finally {
                setBuscandoModal(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [termoModal, modalAberto, meuID]);

    useEffect(() => {
        if (!showGifPicker) {
            setGifsGiphy([]);
            setTermoGifBusca("");
            return;
        }

        const termo = termoGifBusca.trim();
        const delay = termo ? 300 : 0;

        const timer = setTimeout(async () => {
            setBuscandoGifs(true);
            try {
                const res = await fetch(`/api/gifs?q=${encodeURIComponent(termo)}`);
                if (res.ok) {
                    const data = (await res.json()) as { data?: GiphyGif[] };
                    setGifsGiphy(data.data ?? []);
                } else {
                    setGifsGiphy([]);
                }
            } catch {
                setGifsGiphy([]);
            } finally {
                setBuscandoGifs(false);
            }
        }, delay);

        return () => clearTimeout(timer);
    }, [termoGifBusca, showGifPicker]);

    useEffect(() => {
        if (!showEmojiPicker && !showGifPicker) return;

        function handleClickFora(evento: MouseEvent) {
            if (inputRodapeRef.current && !inputRodapeRef.current.contains(evento.target as Node)) {
                setShowEmojiPicker(false);
                setShowGifPicker(false);
            }
        }

        document.addEventListener("mousedown", handleClickFora);
        return () => document.removeEventListener("mousedown", handleClickFora);
    }, [showEmojiPicker, showGifPicker]);

    async function enviarImagem(): Promise<string | undefined> {
        if (!arquivoImagem) return undefined;

        const formData = new FormData();
        formData.append("imagem", arquivoImagem);

        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();

        if (!res.ok || !data.url) {
            throw new Error(data.erro || "Não foi possível enviar a imagem.");
        }

        return data.url as string;
    }

    function limparImagem() {
        if (previewImagem) URL.revokeObjectURL(previewImagem);
        setArquivoImagem(null);
        setPreviewImagem(null);
    }

    function normalizarArquivoImagem(arquivo: File): File {
        if (arquivo.type === "image/gif") {
            if (!arquivo.name.toLowerCase().endsWith(".gif")) {
                return new File([arquivo], `anexo-${Date.now()}.gif`, { type: "image/gif" });
            }
            return arquivo;
        }

        if (!arquivo.name || !arquivo.name.includes(".")) {
            const ext = arquivo.type === "image/png" ? ".png" : arquivo.type === "image/webp" ? ".webp" : ".jpg";
            return new File([arquivo], `anexo-${Date.now()}${ext}`, { type: arquivo.type });
        }

        return arquivo;
    }

    function definirArquivoImagem(arquivo: File) {
        if (!arquivo.type.startsWith("image/")) return;
        if (arquivo.size > 5 * 1024 * 1024) return;

        limparImagem();
        const normalizado = normalizarArquivoImagem(arquivo);
        setArquivoImagem(normalizado);
        setPreviewImagem(URL.createObjectURL(normalizado));
    }

    function handleSelecionarImagem(e: ChangeEvent<HTMLInputElement>) {
        const arquivo = e.target.files?.[0];
        if (!arquivo) return;

        definirArquivoImagem(arquivo);
        e.target.value = "";
    }

    function handleColarImagem(e: ClipboardEvent<HTMLInputElement>) {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (const item of items) {
            if (item.kind === "file" && item.type.startsWith("image/")) {
                const arquivo = item.getAsFile();
                if (!arquivo) continue;

                e.preventDefault();
                definirArquivoImagem(arquivo);
                return;
            }
        }
    }

    async function enviarMensagem(opcoes?: { anexoUrl?: string; conteudo?: string }) {
        if (!chatAtivo || enviando) return;

        const conteudoFinal = opcoes?.conteudo ?? texto.trim();
        let anexoUrl = opcoes?.anexoUrl;

        if (!anexoUrl && arquivoImagem) {
            try {
                anexoUrl = await enviarImagem();
            } catch {
                return;
            }
        }

        if (!conteudoFinal && !anexoUrl) return;

        const payload: Record<string, unknown> = {
            conteudo: conteudoFinal,
            anexo_url: anexoUrl ?? "",
        };
        if (respostaA) payload.resposta_a_id = respostaA.id;

        setEnviando(true);
        try {
            const res = await fetch(`/api/mensagens/${chatAtivo}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                const nova = (await res.json()) as Mensagem;
                setMensagens(atual => (atual.some(m => m.id === nova.id) ? atual : [...atual, nova]));
                setTexto("");
                setRespostaA(null);
                limparImagem();
                setShowEmojiPicker(false);
                setShowGifPicker(false);
                carregarInbox();
            } else if (res.status === 404 && respostaA) {
                removerMensagemInvalida(respostaA.id);
                setRespostaA(null);
            }
        } finally {
            setEnviando(false);
        }
    }

    async function apagarMensagem(id: number) {
        const res = await fetch(`/api/mensagens/msg/${id}`, { method: "DELETE" });
        if (res.ok) {
            setMensagens(atual => atual.filter(m => m.id !== id));
            limparInteracoesMensagem(id);
            carregarInbox();
            return;
        }
        if (res.status === 404) {
            removerMensagemInvalida(id);
        }
    }

    async function salvarEdicao(id: number) {
        const conteudo = editandoTexto.trim();
        if (!conteudo) return;

        const res = await fetch(`/api/mensagens/msg/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ conteudo }),
        });
        if (res.ok) {
            const atualizada = (await res.json()) as Mensagem;
            setMensagens(atual => atual.map(m => (m.id === id ? atualizada : m)));
            setEditandoId(null);
            setEditandoTexto("");
            carregarInbox();
            return;
        }
        if (res.status === 404) {
            removerMensagemInvalida(id);
        }
    }

    async function reagirMensagem(id: number, reacao: string) {
        const res = await fetch(`/api/mensagens/msg/${id}/reagir`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reacao }),
        });
        if (res.ok) {
            const atualizada = (await res.json()) as Mensagem;
            setMensagens(atual => atual.map(m => (m.id === id ? atualizada : m)));
            setReacaoMsgId(null);
            return;
        }
        if (res.status === 404) {
            removerMensagemInvalida(id);
        }
    }

    async function apagarConversa(outroId: number) {
        const res = await fetch(`/api/mensagens/conversa/${outroId}`, { method: "DELETE" });
        if (res.ok) {
            setConversas(atual => atual.filter(c => c.usuario_id !== outroId));
            if (chatAtivo === outroId) {
                setChatAtivo(null);
                setMensagens([]);
            }
        }
    }

    async function toggleFixarConversa(outroId: number) {
        const res = await fetch(`/api/mensagens/conversa/${outroId}/fixar`, { method: "POST" });
        if (res.ok) {
            await carregarInbox();
        }
    }

    async function handleEnviar(e: FormEvent) {
        e.preventDefault();
        await enviarMensagem();
    }

    async function selecionarGifGiphy(url: string) {
        setShowGifPicker(false);
        setTermoGifBusca("");
        await enviarMensagem({ anexoUrl: url });
    }

    function handleEmojiClick(dados: EmojiClickData) {
        setTexto(atual => atual + dados.emoji);
    }

    function selecionarUsuarioModal(usuario: PesquisaUsuario) {
        setModalAberto(false);
        abrirChatComUsuario(usuario);
    }

    return (
        <>
            <Box className="flex h-full min-h-0 overflow-hidden p-0">
                <aside className="flex w-80 shrink-0 flex-col border-r border-cinza-200">
                    <div className="border-b border-cinza-200 px-4 py-4">
                        <div className="flex items-center justify-between gap-2">
                            <h1 className="font-gabarito-bold text-xl text-azul-900">Mensagens</h1>
                            <button
                                type="button"
                                onClick={() => setModalAberto(true)}
                                className="flex h-9 w-9 items-center justify-center rounded-full bg-azul-600 text-white transition hover:bg-azul-700"
                                aria-label="Nova conversa"
                            >
                                <Plus className="h-5 w-5" />
                            </button>
                        </div>
                        <input
                            type="text"
                            value={termoBusca}
                            onChange={e => setTermoBusca(e.target.value)}
                            placeholder="Buscar conversas..."
                            className="mt-3 w-full rounded-full border border-cinza-300 bg-white px-3 py-2 font-gabarito-regular text-sm outline-none focus:border-azul-600"
                        />
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {carregandoInbox ? (
                            <div className="flex justify-center p-6">
                                <Loader2 className="h-6 w-6 animate-spin text-azul-600" />
                            </div>
                        ) : conversasFiltradas.length === 0 ? (
                            <div className="p-4">
                                <p className="font-gabarito-regular text-sm text-cinza-700">
                                    {termoBusca.trim() ? "Nenhuma conversa encontrada." : "Nenhuma conversa ainda."}
                                </p>
                                {termoBusca.trim() && (
                                    <button
                                        type="button"
                                        onClick={() => setModalAberto(true)}
                                        className="mt-3 font-gabarito-bold text-sm text-azul-600 hover:underline"
                                    >
                                        Iniciar nova conversa
                                    </button>
                                )}
                            </div>
                        ) : (
                            conversasFiltradas.map(conversa => (
                                <div
                                    key={conversa.usuario_id}
                                    className={`flex items-center border-b border-cinza-100 ${
                                        chatAtivo === conversa.usuario_id ? "bg-background" : ""
                                    }`}
                                >
                                    <button
                                        type="button"
                                        onClick={() => setChatAtivo(conversa.usuario_id)}
                                        className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left transition hover:bg-background"
                                    >
                                        {conversa.image ? (
                                            <Image
                                                src={mediaUrl(conversa.image)!}
                                                alt={conversa.nome}
                                                width={40}
                                                height={40}
                                                className="h-10 w-10 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-azul-100 font-gabarito-bold text-azul-900">
                                                {conversa.nome.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <p className="flex items-center gap-1 truncate font-gabarito-bold text-sm text-azul-900">
                                                {conversa.fixada && <span aria-label="Fixada">📌</span>}
                                                {conversa.nome}
                                            </p>
                                            <p
                                                className={`truncate text-xs ${
                                                    (conversa.nao_lidas ?? 0) > 0
                                                        ? "font-gabarito-bold text-azul-900"
                                                        : "font-gabarito-regular text-cinza-700"
                                                }`}
                                            >
                                                {conversa.ultima_mensagem
                                                    ? `${conversa.enviada_por_mim ? "Você: " : ""}${conversa.ultima_mensagem}`
                                                    : "Nenhuma mensagem ainda"}
                                            </p>
                                        </div>
                                        {(conversa.nao_lidas ?? 0) > 0 && (
                                            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                                                {(conversa.nao_lidas ?? 0) > 99 ? "99+" : conversa.nao_lidas}
                                            </span>
                                        )}
                                    </button>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger
                                            className="mr-2 rounded-full p-1.5 text-cinza-600 transition hover:bg-cinza-100"
                                            aria-label="Opções da conversa"
                                        >
                                            <MoreHorizontal className="h-4 w-4" />
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => toggleFixarConversa(conversa.usuario_id)}>
                                                {conversa.fixada ? "Desfixar conversa" : "Fixar conversa"}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                variant="destructive"
                                                onClick={() => apagarConversa(conversa.usuario_id)}
                                            >
                                                Apagar conversa
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            ))
                        )}
                    </div>
                </aside>

                <section className="flex min-w-0 flex-1 flex-col">
                    {!chatAtivo || !conversaAtiva ? (
                        <div className="flex flex-1 items-center justify-center p-8">
                            <p className="font-gabarito-regular text-cinza-700">
                                Selecione uma mensagem para iniciar uma conversa.
                            </p>
                        </div>
                    ) : (
                        <>
                            <header className="flex items-center gap-3 border-b border-cinza-200 px-4 py-3">
                                {conversaAtiva.image ? (
                                    <Image
                                        src={mediaUrl(conversaAtiva.image)!}
                                        alt={conversaAtiva.nome}
                                        width={40}
                                        height={40}
                                        className="h-10 w-10 rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-azul-100 font-gabarito-bold text-azul-900">
                                        {conversaAtiva.nome.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <div>
                                    <p className="font-gabarito-bold text-base text-azul-900">{conversaAtiva.nome}</p>
                                    <p className="font-gabarito-regular text-xs text-cinza-700">
                                        @{conversaAtiva.nick}
                                    </p>
                                </div>
                            </header>

                            <div className="flex-1 space-y-3 overflow-x-hidden overflow-y-auto px-4 py-4">
                                {carregandoChat ? (
                                    <div className="flex justify-center py-8">
                                        <Loader2 className="h-6 w-6 animate-spin text-azul-600" />
                                    </div>
                                ) : (
                                    mensagens.map(msg => {
                                        const minha = Number(msg.remetente_id) === meuID;
                                        const soImagem = !!msg.anexo_url && !msg.conteudo?.trim();

                                        return (
                                            <div
                                                key={msg.id}
                                                className={`flex w-full min-w-0 ${minha ? "justify-end" : "justify-start"}`}
                                            >
                                                <div
                                                    className={`group relative flex w-fit max-w-[75%] min-w-0 flex-col ${
                                                        minha ? "items-end" : "items-start"
                                                    }`}
                                                >
                                                    {msg.resposta_a && (
                                                        <div
                                                            className={`mb-1 w-full truncate rounded-lg border-l-2 px-2 py-1 font-gabarito-regular text-xs ${
                                                                minha
                                                                    ? "border-azul-300 bg-azul-500/30 text-white/90"
                                                                    : "border-gray-400 bg-gray-200 text-cinza-700"
                                                            }`}
                                                        >
                                                            {textoResumo(msg.resposta_a)}
                                                        </div>
                                                    )}

                                                    <div
                                                        className={`absolute z-10 flex gap-0.5 rounded-full border border-cinza-200 bg-white px-1 py-0.5 shadow-sm opacity-0 transition group-hover:opacity-100 ${
                                                            minha
                                                                ? "-left-2 top-1/2 -translate-x-full -translate-y-1/2"
                                                                : "-right-2 top-1/2 translate-x-full -translate-y-1/2"
                                                        }`}
                                                    >
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setRespostaA(msg);
                                                                setEditandoId(null);
                                                            }}
                                                            className="rounded-full p-1 text-cinza-600 hover:bg-cinza-100"
                                                            aria-label="Responder"
                                                        >
                                                            <Reply className="h-3.5 w-3.5" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setReacaoMsgId(reacaoMsgId === msg.id ? null : msg.id)
                                                            }
                                                            className="rounded-full p-1 text-cinza-600 hover:bg-cinza-100"
                                                            aria-label="Reagir"
                                                        >
                                                            <Smile className="h-3.5 w-3.5" />
                                                        </button>
                                                        {minha && msg.conteudo?.trim() && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setEditandoId(msg.id);
                                                                    setEditandoTexto(msg.conteudo);
                                                                    setRespostaA(null);
                                                                }}
                                                                className="rounded-full p-1 text-cinza-600 hover:bg-cinza-100"
                                                                aria-label="Editar"
                                                            >
                                                                <Pencil className="h-3.5 w-3.5" />
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => apagarMensagem(msg.id)}
                                                            className="rounded-full p-1 text-red-600 hover:bg-red-50"
                                                            aria-label="Apagar"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>

                                                    {reacaoMsgId === msg.id && (
                                                        <div
                                                            className={`absolute z-20 flex gap-1 rounded-full border border-cinza-200 bg-white px-2 py-1 shadow-lg ${
                                                                minha ? "right-0 -top-10" : "left-0 -top-10"
                                                            }`}
                                                        >
                                                            {REACOES.map(emoji => (
                                                                <button
                                                                    key={emoji}
                                                                    type="button"
                                                                    onClick={() => reagirMensagem(msg.id, emoji)}
                                                                    className="text-lg transition hover:scale-125"
                                                                >
                                                                    {emoji}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {soImagem ? (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img
                                                            src={msg.anexo_url}
                                                            className="max-h-64 max-w-full rounded-xl object-cover shadow-sm"
                                                            alt="Anexo"
                                                            loading="eager"
                                                        />
                                                    ) : (
                                                        <div
                                                            className={`w-full min-w-0 overflow-hidden rounded-2xl px-4 py-2 font-gabarito-regular text-sm wrap-break-word ${
                                                                minha
                                                                    ? "rounded-br-sm bg-azul-600 text-white"
                                                                    : "rounded-bl-sm bg-white text-azul-900 shadow-sm"
                                                            }`}
                                                        >
                                                            {msg.anexo_url && (
                                                                // eslint-disable-next-line @next/next/no-img-element
                                                                <img
                                                                    src={msg.anexo_url}
                                                                    className="mb-1 mt-1 max-h-64 max-w-xs rounded-xl object-cover shadow-sm md:max-w-sm"
                                                                    alt="Anexo"
                                                                    loading="eager"
                                                                />
                                                            )}
                                                            {editandoId === msg.id ? (
                                                                <div className="space-y-2">
                                                                    <input
                                                                        value={editandoTexto}
                                                                        onChange={e => setEditandoTexto(e.target.value)}
                                                                        className="w-full rounded-lg border border-cinza-300 bg-white px-2 py-1 text-sm text-azul-900 outline-none"
                                                                        autoFocus
                                                                    />
                                                                    <div className="flex gap-2">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => salvarEdicao(msg.id)}
                                                                            className="font-gabarito-bold text-xs text-white underline"
                                                                        >
                                                                            Salvar
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setEditandoId(null);
                                                                                setEditandoTexto("");
                                                                            }}
                                                                            className="font-gabarito-regular text-xs text-white/80 underline"
                                                                        >
                                                                            Cancelar
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    {msg.conteudo &&
                                                                        renderConteudoMensagem(msg.conteudo, minha)}
                                                                    {msg.editada && (
                                                                        <span
                                                                            className={`ml-1 text-xs italic ${
                                                                                minha
                                                                                    ? "text-white/70"
                                                                                    : "text-cinza-600"
                                                                            }`}
                                                                        >
                                                                            (editado)
                                                                        </span>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    )}

                                                    {msg.reacao && (
                                                        <span className="mt-2 rounded-full border border-gray-200 bg-white px-2 py-0.5 text-sm shadow-sm">
                                                            {msg.reacao}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={fimRef} />
                            </div>

                            <form onSubmit={handleEnviar} className="border-t border-cinza-200 px-4 py-3">
                                {respostaA && (
                                    <div className="mb-2 flex items-center justify-between rounded-xl border border-cinza-200 bg-cinza-50 px-3 py-2">
                                        <p className="min-w-0 truncate font-gabarito-regular text-xs text-cinza-700">
                                            Respondendo a{" "}
                                            <span className="font-gabarito-bold">
                                                {respostaA.remetente_id === meuID ? "você" : conversaAtiva?.nome}
                                            </span>
                                            : {textoResumo(respostaA)}
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => setRespostaA(null)}
                                            className="ml-2 shrink-0 text-cinza-600 hover:text-azul-900"
                                            aria-label="Cancelar resposta"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                )}
                                {previewImagem && (
                                    <div className="relative mb-2 w-fit">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={previewImagem}
                                            alt="Preview"
                                            className="h-20 w-20 rounded-xl object-cover"
                                        />
                                        <button
                                            type="button"
                                            onClick={limparImagem}
                                            className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-cinza-800 text-white"
                                            aria-label="Remover imagem"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                )}

                                <div
                                    ref={inputRodapeRef}
                                    className="relative rounded-2xl border border-cinza-300 bg-white px-2 py-2"
                                >
                                    {showEmojiPicker && (
                                        <div className="absolute bottom-14 left-0 z-50">
                                            <EmojiPicker onEmojiClick={handleEmojiClick} width={320} height={400} />
                                        </div>
                                    )}

                                    {showGifPicker && (
                                        <div className="absolute bottom-14 left-10 z-50 w-80 rounded-2xl border border-cinza-200 bg-white p-3 shadow-lg">
                                            <input
                                                type="text"
                                                value={termoGifBusca}
                                                onChange={e => setTermoGifBusca(e.target.value)}
                                                placeholder="Buscar GIFs..."
                                                className="mb-2 w-full rounded-full border border-cinza-300 px-3 py-2 font-gabarito-regular text-sm outline-none focus:border-azul-600"
                                                autoFocus
                                            />
                                            <div className="grid max-h-64 grid-cols-3 gap-2 overflow-y-auto">
                                                {buscandoGifs ? (
                                                    <div className="col-span-3 flex justify-center py-6">
                                                        <Loader2 className="h-5 w-5 animate-spin text-azul-600" />
                                                    </div>
                                                ) : gifsGiphy.length === 0 ? (
                                                    <p className="col-span-3 py-4 text-center font-gabarito-regular text-xs text-cinza-700">
                                                        {termoGifBusca.trim()
                                                            ? "Nenhum GIF encontrado."
                                                            : "Nenhum GIF popular no momento."}
                                                    </p>
                                                ) : (
                                                    gifsGiphy.map(gif => (
                                                        <button
                                                            key={gif.id}
                                                            type="button"
                                                            onClick={() => selecionarGifGiphy(gif.images.original.url)}
                                                            className="overflow-hidden rounded-lg transition hover:opacity-80"
                                                        >
                                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                                            <img
                                                                src={gif.images.fixed_height.url}
                                                                alt="GIF"
                                                                className="h-24 w-full object-cover"
                                                            />
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-1">
                                        <input
                                            id={inputImagemId}
                                            type="file"
                                            accept="image/*,image/gif"
                                            className="hidden"
                                            onChange={handleSelecionarImagem}
                                        />
                                        <label
                                            htmlFor={inputImagemId}
                                            className="flex cursor-pointer rounded-full p-2 text-azul-600 transition hover:bg-azul-50"
                                            aria-label="Anexar imagem"
                                        >
                                            <ImageIcon className="h-5 w-5" />
                                        </label>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowEmojiPicker(false);
                                                setShowGifPicker(v => !v);
                                            }}
                                            className="rounded border border-azul-600 px-1.5 py-0.5 font-gabarito-bold text-[10px] leading-none text-azul-600 transition hover:bg-azul-50"
                                        >
                                            GIF
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowGifPicker(false);
                                                setShowEmojiPicker(v => !v);
                                            }}
                                            className="rounded-full p-2 text-azul-600 transition hover:bg-azul-50"
                                            aria-label="Emoji"
                                        >
                                            <Smile className="h-5 w-5" />
                                        </button>

                                        <input
                                            type="text"
                                            value={texto}
                                            onChange={e => setTexto(e.target.value)}
                                            onPaste={handleColarImagem}
                                            placeholder="Escreva uma mensagem..."
                                            className="min-w-0 flex-1 bg-transparent px-2 font-gabarito-regular text-sm outline-none"
                                        />

                                        <button
                                            type="submit"
                                            disabled={enviando || (!texto.trim() && !arquivoImagem)}
                                            className="rounded-full p-2 text-azul-600 transition hover:bg-azul-50 disabled:cursor-not-allowed disabled:opacity-40"
                                            aria-label="Enviar"
                                        >
                                            {enviando ? (
                                                <Loader2 className="h-5 w-5 animate-spin" />
                                            ) : (
                                                <Send className="h-5 w-5" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </>
                    )}
                </section>
            </Box>

            <Dialog open={modalAberto} onOpenChange={setModalAberto}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="font-gabarito-bold text-lg text-azul-900">Nova conversa</DialogTitle>
                    </DialogHeader>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cinza-500" />
                        <input
                            type="text"
                            value={termoModal}
                            onChange={e => setTermoModal(e.target.value)}
                            placeholder="Buscar usuários..."
                            className="w-full rounded-full border border-cinza-300 py-2 pl-9 pr-4 font-gabarito-regular text-sm outline-none focus:border-azul-600"
                            autoFocus
                        />
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                        {buscandoModal ? (
                            <div className="flex justify-center py-6">
                                <Loader2 className="h-5 w-5 animate-spin text-azul-600" />
                            </div>
                        ) : termoModal.trim() && usuariosModal.length === 0 ? (
                            <p className="py-4 text-center font-gabarito-regular text-sm text-cinza-700">
                                Nenhum usuário encontrado.
                            </p>
                        ) : (
                            usuariosModal.map(usuario => (
                                <button
                                    key={usuario.id}
                                    type="button"
                                    onClick={() => selecionarUsuarioModal(usuario)}
                                    className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition hover:bg-background"
                                >
                                    {usuario.image ? (
                                        <Image
                                            src={mediaUrl(usuario.image)!}
                                            alt={usuario.nome}
                                            width={36}
                                            height={36}
                                            className="h-9 w-9 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-azul-100">
                                            <User className="h-4 w-4 text-azul-600" />
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        <p className="truncate font-gabarito-bold text-sm text-azul-900">
                                            {usuario.nome}
                                        </p>
                                        <p className="truncate font-gabarito-regular text-xs text-cinza-700">
                                            @{usuario.nick}
                                        </p>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}

export default function MensagensPage() {
    return (
        <Suspense
            fallback={
                <Box className="flex items-center justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin text-azul-600" />
                </Box>
            }
        >
            <MensagensConteudo />
        </Suspense>
    );
}
