"use client";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { BuscaLivrosResposta, LivroBusca } from "@/types/livro";
import type { EstanteItem } from "@/types/estante";
import FormularioLivroCampos from "@/app/components/FormularioLivroCampos";
import EstanteCarousel from "@/app/components/EstanteCarousel";
import { useCategoriasLivro } from "@/lib/hooks/useCategorias";
import {
    dadosDeLivroBusca,
    dadosLivroVazios,
    type DadosLivroForm,
    livroPrecisaCadastro,
    registrarLivroUsuario,
} from "@/lib/livro-cadastro";
import { mediaUrl } from "@/lib/media";
import { textoContemLink } from "@/lib/texto";
import { TEMPLATES_AVALIACAO } from "@/lib/templates-avaliacao";
import type { TemplateAvaliacao } from "@/types/template";
import { enviarImagemAvatar, validarArquivoImagem } from "@/lib/upload";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import {
    ArrowLeft,
    BookPlus,
    Check,
    ImageIcon,
    Loader2,
    Lock,
    Search,
    Star,
    X,
} from "lucide-react";
import Image from "next/image";
import { ChangeEvent, ClipboardEvent, useCallback, useEffect, useId, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { usePlano } from "./PlanoProvider";
import PlanoUpgradeModal from "./PlanoUpgradeModal";

type NovaAvaliacaoModalProps = {
    open: boolean;
    onClose: () => void;
    livroInicial?: DadosLivroForm | null;
};

type Passo = 1 | 2 | 3 | 4;

const PASSOS = [
    { id: 1 as const, rotulo: "Livro" },
    { id: 2 as const, rotulo: "Nota" },
    { id: 3 as const, rotulo: "Avaliação" },
    { id: 4 as const, rotulo: "Publicar" },
];

const DEBOUNCE_MS = 500;
const MIN_CARACTERES_BUSCA = 2;

const slideVariants = {
    enter: (dir: number) => ({
        x: dir > 0 ? 48 : -48,
        opacity: 0,
    }),
    center: {
        x: 0,
        opacity: 1,
    },
    exit: (dir: number) => ({
        x: dir > 0 ? -48 : 48,
        opacity: 0,
    }),
};

type GiphyGif = {
    id: string;
    images: {
        fixed_height: { url: string };
        original: { url: string };
    };
};

const inputClassName =
    "w-full px-4 py-2 border-2 border-[#515151] rounded-full outline-none focus:border-azul-600 font-gabarito-regular bg-white";

function chaveLivro(livro: LivroBusca) {
    return `${livro.origem}-${livro.id ?? livro.google_volume_id}`;
}

function livroPrecisaCompletar(dados: DadosLivroForm) {
    return !dados.autor.trim() || !dados.capa_url.trim() || !dados.paginas.trim();
}

function parseBuscaResposta(data: unknown): BuscaLivrosResposta {
    if (Array.isArray(data)) {
        return { resultados: data };
    }
    if (data && typeof data === "object" && "resultados" in data) {
        const resposta = data as BuscaLivrosResposta;
        return {
            resultados: Array.isArray(resposta.resultados) ? resposta.resultados : [],
            aviso: resposta.aviso,
        };
    }
    return { resultados: [] };
}

function CapaHero({
    dados,
    tamanho = "md",
}: {
    dados: DadosLivroForm;
    tamanho?: "sm" | "md" | "lg";
}) {
    const dims =
        tamanho === "lg"
            ? { w: 140, h: 210, className: "h-[210px] w-[140px]" }
            : tamanho === "md"
              ? { w: 96, h: 144, className: "h-36 w-24" }
              : { w: 64, h: 96, className: "h-24 w-16" };

    if (mediaUrl(dados.capa_url)) {
        return (
            <Image
                src={mediaUrl(dados.capa_url)!}
                alt={dados.titulo}
                width={dims.w}
                height={dims.h}
                className={cn(dims.className, "shrink-0 rounded-xl object-cover shadow-lg ring-1 ring-black/5")}
                unoptimized
            />
        );
    }

    return (
        <div
            className={cn(
                dims.className,
                "flex shrink-0 items-center justify-center rounded-xl bg-azul-200 text-4xl shadow-lg",
            )}
        >
            📖
        </div>
    );
}

function IndicadorPassos({ passo }: { passo: Passo }) {
    return (
        <div className="flex items-center justify-center gap-1.5 sm:gap-2" aria-label={`Passo ${passo} de 4`}>
            {PASSOS.map((p, i) => {
                const ativo = p.id === passo;
                const feito = p.id < passo;
                return (
                    <div key={p.id} className="flex items-center gap-1.5 sm:gap-2">
                        {i > 0 && (
                            <div
                                className={cn(
                                    "h-px w-4 sm:w-6",
                                    feito || ativo ? "bg-azul-600" : "bg-cinza-200",
                                )}
                            />
                        )}
                        <div className="flex flex-col items-center gap-1">
                            <div
                                className={cn(
                                    "flex h-7 w-7 items-center justify-center rounded-full font-gabarito-bold text-xs transition-colors",
                                    feito && "bg-azul-600 text-white",
                                    ativo && "bg-azul-600 text-white ring-4 ring-azul-100",
                                    !feito && !ativo && "bg-cinza-200 text-cinza-700",
                                )}
                            >
                                {feito ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : p.id}
                            </div>
                            <span
                                className={cn(
                                    "hidden font-gabarito-medium text-[10px] uppercase tracking-wide sm:block",
                                    ativo || feito ? "text-azul-600" : "text-cinza-700",
                                )}
                            >
                                {p.rotulo}
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default function NovaAvaliacaoModal({ open, onClose, livroInicial = null }: NovaAvaliacaoModalProps) {
    const { data: session } = useSession();
    const nick = session?.user?.nick ?? "";
    const { temPlanoTop: temTop } = usePlano();

    const [estante, setEstante] = useState<EstanteItem[]>([]);
    const [carregandoEstante, setCarregandoEstante] = useState(false);
    const [mostrarBusca, setMostrarBusca] = useState(false);

    const [passo, setPasso] = useState<Passo>(1);
    const [direcao, setDirecao] = useState(1);

    const [busca, setBusca] = useState("");
    const [resultados, setResultados] = useState<LivroBusca[]>([]);
    const [buscando, setBuscando] = useState(false);
    const [modoManual, setModoManual] = useState(false);
    const [dadosLivro, setDadosLivro] = useState<DadosLivroForm | null>(null);
    const { categorias, carregando: carregandoCategorias } = useCategoriasLivro(open);
    const [avisoBusca, setAvisoBusca] = useState("");
    const [nota, setNota] = useState(0);
    const [notaHover, setNotaHover] = useState(0);
    const [texto, setTexto] = useState("");
    const [contemSpoiler, setContemSpoiler] = useState(false);
    const [arquivoImagem, setArquivoImagem] = useState<File | null>(null);
    const [previewImagem, setPreviewImagem] = useState<string | null>(null);
    const [anexoUrlDireto, setAnexoUrlDireto] = useState<string | null>(null);
    const [showGifPicker, setShowGifPicker] = useState(false);
    const [termoGifBusca, setTermoGifBusca] = useState("");
    const [gifsGiphy, setGifsGiphy] = useState<GiphyGif[]>([]);
    const [buscandoGifs, setBuscandoGifs] = useState(false);
    const [erro, setErro] = useState("");
    const [enviando, setEnviando] = useState(false);
    const [templateSelecionado, setTemplateSelecionado] = useState<number | null>(null);
    const [templatesAvaliacao, setTemplatesAvaliação] = useState<TemplateAvaliacao[]>(TEMPLATES_AVALIACAO);
    const [upgradeTemplatesAberto, setUpgradeTemplatesAberto] = useState(false);
    const inputImagemId = useId();
    const buscaRef = useRef(busca);
    buscaRef.current = busca;

    const carregarEstante = useCallback(async () => {
        if (!nick) {
            setEstante([]);
            return;
        }
        setCarregandoEstante(true);
        try {
            const res = await fetch(`/api/usuarios/${encodeURIComponent(nick)}/estante`);
            if (!res.ok) {
                setEstante([]);
                return;
            }
            const data = (await res.json()) as { livros?: EstanteItem[] };
            setEstante(Array.isArray(data.livros) ? data.livros : []);
        } catch {
            setEstante([]);
        } finally {
            setCarregandoEstante(false);
        }
    }, [nick]);

    useEffect(() => {
        if (!open) return;
        fetch("/api/templates")
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (Array.isArray(data) && data.length > 0) {
                    setTemplatesAvaliação(data as TemplateAvaliacao[]);
                }
            })
            .catch(() => {});
    }, [open]);

    useEffect(() => {
        if (open) {
            void carregarEstante();
        } else {
            setPasso(1);
            setDirecao(1);
            setMostrarBusca(false);
            setBusca("");
            setResultados([]);
            setModoManual(false);
            setDadosLivro(null);
            setAvisoBusca("");
            setNota(0);
            setNotaHover(0);
            setTexto("");
            setContemSpoiler(false);
            limparAnexo();
            setShowGifPicker(false);
            setTemplateSelecionado(null);
            setTemplatesAvaliação(TEMPLATES_AVALIACAO);
            setErro("");
            setEstante([]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- limparAnexo is stable enough; reset only on open toggle
    }, [open, carregarEstante]);

    useEffect(() => {
        if (open && livroInicial) {
            setDadosLivro(livroInicial);
            setModoManual(false);
            setBusca("");
            setResultados([]);
            setAvisoBusca("");
            setMostrarBusca(false);
            setErro("");
            setDirecao(1);
            setPasso(livroPrecisaCompletar(livroInicial) ? 1 : 2);
        }
    }, [open, livroInicial]);

    function limparAnexo() {
        if (previewImagem) URL.revokeObjectURL(previewImagem);
        setArquivoImagem(null);
        setPreviewImagem(null);
        setAnexoUrlDireto(null);
    }

    function definirArquivo(arquivo: File) {
        const erroValidacao = validarArquivoImagem(arquivo);
        if (erroValidacao) {
            setErro(erroValidacao);
            return;
        }
        limparAnexo();
        setArquivoImagem(arquivo);
        setPreviewImagem(URL.createObjectURL(arquivo));
        setErro("");
    }

    async function buscarGifs(termo: string) {
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
    }

    function selecionarGif(url: string) {
        limparAnexo();
        setAnexoUrlDireto(url);
        setShowGifPicker(false);
        setTermoGifBusca("");
        setErro("");
    }

    useEffect(() => {
        if (!open || modoManual || dadosLivro || !mostrarBusca) {
            return;
        }

        const termo = busca.trim();

        if (termo.length < MIN_CARACTERES_BUSCA) {
            setResultados([]);
            setAvisoBusca("");
            setBuscando(false);
            return;
        }

        const controller = new AbortController();

        const timer = setTimeout(async () => {
            setBuscando(true);
            setAvisoBusca("");

            try {
                const res = await fetch(`/api/livros/buscar?q=${encodeURIComponent(termo)}`, {
                    signal: controller.signal,
                });
                const data = await res.json();

                if (buscaRef.current.trim() !== termo) {
                    return;
                }

                if (!res.ok) {
                    setResultados([]);
                    if (termo.length >= MIN_CARACTERES_BUSCA) {
                        setAvisoBusca(
                            data.erro ||
                                "Não foi possível buscar agora. Tente de novo ou cadastre o livro manualmente.",
                        );
                    }
                    return;
                }

                const { resultados: itens, aviso } = parseBuscaResposta(data);
                setErro("");
                setResultados(itens);

                if (itens.length === 0 && aviso) {
                    setAvisoBusca(aviso);
                } else if (itens.length === 0) {
                    setAvisoBusca(`Nenhum livro encontrado para "${termo}".`);
                } else {
                    setAvisoBusca("");
                }
            } catch (err) {
                if (err instanceof DOMException && err.name === "AbortError") {
                    return;
                }
                if (buscaRef.current.trim() !== termo) {
                    return;
                }
                setResultados([]);
                setAvisoBusca("Não foi possível buscar agora. Tente de novo ou cadastre o livro manualmente.");
            } finally {
                if (!controller.signal.aborted && buscaRef.current.trim() === termo) {
                    setBuscando(false);
                }
            }
        }, DEBOUNCE_MS);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [busca, open, modoManual, dadosLivro, mostrarBusca]);

    function irPara(proximo: Passo) {
        setDirecao(proximo > passo ? 1 : -1);
        setErro("");
        setPasso(proximo);
    }

    function aplicarLivro(dados: DadosLivroForm, manual = false) {
        setDadosLivro(dados);
        setModoManual(manual);
        setBusca("");
        setResultados([]);
        setAvisoBusca("");
        setMostrarBusca(false);
        setErro("");

        if (!manual && dados.livro_id && !livroPrecisaCompletar(dados)) {
            setDirecao(1);
            setPasso(2);
        }
    }

    function selecionarDaEstante(item: EstanteItem) {
        aplicarLivro(
            dadosDeLivroBusca({
                id: item.livro.id,
                titulo: item.livro.titulo,
                autor: item.livro.autor,
                paginas: item.livro.paginas,
                capa_url: item.livro.capa_url,
            }),
        );
    }

    function selecionarLivroBusca(livro: LivroBusca) {
        aplicarLivro(dadosDeLivroBusca(livro));
    }

    function iniciarCadastroManual() {
        setModoManual(true);
        setDadosLivro(dadosLivroVazios(busca.trim()));
        setResultados([]);
        setMostrarBusca(false);
        setErro("");
    }

    function limparLivro() {
        setDadosLivro(null);
        setModoManual(false);
        setMostrarBusca(false);
        setErro("");
        if (passo !== 1) {
            irPara(1);
        }
    }

    function atualizarDado(campo: keyof DadosLivroForm, valor: string | number[]) {
        setDadosLivro((atual) => (atual ? { ...atual, [campo]: valor } : atual));
    }

    function validarDadosLivro(dados: DadosLivroForm) {
        if (!dados.titulo.trim() || !dados.autor.trim()) {
            return "Título e autor são obrigatórios.";
        }
        if (livroPrecisaCadastro(dados) && dados.categorias_ids.length === 0) {
            return "Selecione ao menos uma categoria para o livro.";
        }
        return "";
    }

    function validarPassoLivro(): boolean {
        if (!dadosLivro) {
            setErro("Selecione ou cadastre um livro.");
            return false;
        }
        const validacao = validarDadosLivro(dadosLivro);
        if (validacao) {
            setErro(validacao);
            return false;
        }
        return true;
    }

    function avancarDoLivro() {
        if (!validarPassoLivro()) return;
        irPara(2);
    }

    function validarPassoNota(): boolean {
        if (nota < 1 || nota > 5) {
            setErro("Selecione uma nota de 1 a 5.");
            return false;
        }
        return true;
    }

    function avancarDaNota() {
        if (!validarPassoNota()) return;
        irPara(3);
    }

    function validarPassoAvaliacao(): boolean {
        const textoFinal = texto.trim();
        if (textoFinal && textoContemLink(textoFinal)) {
            setErro("Links não são permitidos na avaliação.");
            return false;
        }
        if (!textoFinal && !arquivoImagem && !anexoUrlDireto) {
            setErro("Escreva a avaliação ou anexe uma imagem.");
            return false;
        }
        return true;
    }

    function avancarDaAvaliacao() {
        if (!validarPassoAvaliacao()) return;
        irPara(4);
    }

    function voltar() {
        if (passo === 2) {
            setDadosLivro(null);
            setModoManual(false);
            setMostrarBusca(false);
            irPara(1);
            return;
        }
        if (passo === 3) {
            irPara(2);
            return;
        }
        if (passo === 4) {
            irPara(3);
        }
    }

    async function registrarLivro(dados: DadosLivroForm): Promise<number> {
        const validacao = validarDadosLivro(dados);
        if (validacao) {
            throw new Error(validacao);
        }
        return registrarLivroUsuario(dados);
    }

    async function confirmarPublicacao() {
        setErro("");

        if (!dadosLivro || !validarPassoLivro() || !validarPassoNota() || !validarPassoAvaliacao()) {
            return;
        }

        const textoFinal = texto.trim();
        setEnviando(true);
        try {
            const livroId = await registrarLivro(dadosLivro);

            let anexoUrl: string | undefined;
            if (arquivoImagem) {
                anexoUrl = await enviarImagemAvatar(arquivoImagem);
            } else if (anexoUrlDireto) {
                anexoUrl = anexoUrlDireto;
            }

            const payload: Record<string, unknown> = {
                livro_id: livroId,
                nota,
                texto: textoFinal,
                contem_spoiler: contemSpoiler,
            };
            if (anexoUrl) payload.anexo_url = anexoUrl;
            if (templateSelecionado) payload.template_id = templateSelecionado;

            const res = await fetch("/api/avaliacoes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json();

            if (!res.ok) {
                setErro(data.erro || "Não foi possível publicar a avaliação.");
                return;
            }

            window.dispatchEvent(new Event("feed:refresh"));
            window.dispatchEvent(new CustomEvent("livro:registrado", { detail: { livroId } }));
            onClose();
        } catch (err) {
            setErro(err instanceof Error ? err.message : "Não foi possível publicar a avaliação.");
        } finally {
            setEnviando(false);
        }
    }

    const notaExibida = notaHover || nota;
    const precisaCompletar = dadosLivro ? livroPrecisaCompletar(dadosLivro) : false;
    const exibirFormularioLivro = !!dadosLivro && (modoManual || precisaCompletar || livroPrecisaCadastro(dadosLivro));
    const templateAtivo = templatesAvaliacao.find((t) => t.id === templateSelecionado) ?? null;

    const tituloPasso =
        passo === 1
            ? "Sobre qual livro?"
            : passo === 2
              ? "Qual a sua nota?"
              : passo === 3
                ? "Escreva sua avaliação"
                : "Tudo certo?";

    const subtituloPasso =
        passo === 1
            ? "Escolha na estante ou busque o livro para avaliar."
            : passo === 2
              ? "Dê estrelas e, se quiser, use um modelo OpinioTop."
              : passo === 3
                ? "Conte o que achou. Marque spoiler se precisar."
                : "Confira o resumo e publique sua avaliação.";

    const mostrarRodape = passo > 1 || exibirFormularioLivro;

    return (
        <>
            <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
                <DialogContent
                    showCloseButton
                    className="flex h-[min(92vh,720px)] w-full max-w-full flex-col gap-0 overflow-hidden rounded-3xl border-0 bg-background p-0 sm:h-[min(88vh,680px)] sm:max-w-xl sm:rounded-[2rem]"
                >
                    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
                        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
                            <div className="absolute -left-20 -top-24 h-56 w-56 rounded-full bg-azul-100/80 blur-3xl" />
                            <div className="absolute -right-16 top-32 h-48 w-48 rounded-full bg-azul-50 blur-3xl" />
                            <div className="absolute bottom-0 left-1/3 h-40 w-64 rounded-full bg-azul-100/40 blur-3xl" />
                        </div>

                        <div className="relative z-10 flex shrink-0 flex-col gap-4 px-5 pb-2 pt-5 sm:px-7 sm:pt-6">
                            <div className="pr-8">
                                <p className="font-gabarito-medium text-[11px] uppercase tracking-[0.18em] text-azul-600">
                                    Nova avaliação
                                </p>
                                <DialogTitle className="mt-1 font-gabarito-bold text-2xl leading-tight text-azul-900 sm:text-[1.75rem]">
                                    {tituloPasso}
                                </DialogTitle>
                                <p className="mt-1 font-gabarito-regular text-sm text-cinza-700">{subtituloPasso}</p>
                            </div>
                            <IndicadorPassos passo={passo} />
                        </div>

                        <div className="relative z-10 min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-7">
                            <AnimatePresence mode="wait" custom={direcao}>
                                <motion.div
                                    key={passo}
                                    custom={direcao}
                                    variants={slideVariants}
                                    initial="enter"
                                    animate="center"
                                    exit="exit"
                                    transition={{ type: "spring", stiffness: 380, damping: 34, mass: 0.85 }}
                                    className="flex min-h-full flex-col"
                                >
                                    {passo === 1 && (
                                        <div className="flex flex-1 flex-col gap-4 py-2">
                                            {exibirFormularioLivro && dadosLivro ? (
                                                <div className="flex flex-col gap-4 rounded-3xl bg-azul-50/60 p-4 ring-1 ring-azul-100">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <p className="font-gabarito-bold text-base text-azul-900">
                                                            {modoManual ? "Cadastro do livro" : "Complete os dados"}
                                                        </p>
                                                        <button
                                                            type="button"
                                                            onClick={limparLivro}
                                                            className="shrink-0 rounded-full p-1 hover:bg-white"
                                                            aria-label="Trocar livro"
                                                        >
                                                            <X className="h-5 w-5 text-cinza-700" />
                                                        </button>
                                                    </div>
                                                    {precisaCompletar && (
                                                        <p className="font-gabarito-regular text-sm text-amber-800">
                                                            Complete as informações que estiverem faltando antes de
                                                            continuar.
                                                        </p>
                                                    )}
                                                    <FormularioLivroCampos
                                                        dados={dadosLivro}
                                                        modoManual={modoManual}
                                                        categorias={categorias}
                                                        carregandoCategorias={carregandoCategorias}
                                                        onChange={atualizarDado}
                                                    />
                                                </div>
                                            ) : (
                                                <>
                                                    {!mostrarBusca && (
                                                        <div className="flex flex-1 flex-col justify-center gap-2">
                                                            {carregandoEstante ? (
                                                                <div className="flex flex-col items-center justify-center gap-3 py-16">
                                                                    <Loader2 className="h-9 w-9 animate-spin text-azul-600" />
                                                                    <p className="font-gabarito-regular text-sm text-cinza-700">
                                                                        Abrindo sua estante...
                                                                    </p>
                                                                </div>
                                                            ) : (
                                                                <EstanteCarousel
                                                                    livros={estante}
                                                                    apenasAtivos={false}
                                                                    onSelecionar={selecionarDaEstante}
                                                                    dica="Arraste ou toque no livro que você quer avaliar"
                                                                />
                                                            )}
                                                        </div>
                                                    )}

                                                    {mostrarBusca && (
                                                        <div className="relative flex flex-col gap-3">
                                                            <div className="relative">
                                                                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-cinza-700" />
                                                                <input
                                                                    type="text"
                                                                    value={busca}
                                                                    onChange={(e) => {
                                                                        setBusca(e.target.value);
                                                                        if (
                                                                            e.target.value.trim().length >=
                                                                            MIN_CARACTERES_BUSCA
                                                                        ) {
                                                                            setBuscando(true);
                                                                        }
                                                                    }}
                                                                    placeholder="Buscar livro por título ou autor..."
                                                                    className={`${inputClassName} pl-10`}
                                                                    autoFocus
                                                                />
                                                                {buscando && (
                                                                    <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-azul-600" />
                                                                )}
                                                            </div>

                                                            {avisoBusca && !buscando && (
                                                                <p
                                                                    className={`rounded-2xl px-4 py-3 font-gabarito-regular text-sm ${
                                                                        resultados.length === 0
                                                                            ? "bg-amber-50 text-amber-900"
                                                                            : "bg-background text-cinza-700"
                                                                    }`}
                                                                >
                                                                    {avisoBusca}
                                                                </p>
                                                            )}

                                                            {busca.trim().length > 0 &&
                                                                busca.trim().length < MIN_CARACTERES_BUSCA && (
                                                                    <p className="font-gabarito-regular text-sm text-cinza-700">
                                                                        Digite pelo menos {MIN_CARACTERES_BUSCA}{" "}
                                                                        caracteres para buscar.
                                                                    </p>
                                                                )}

                                                            {resultados.length > 0 && (
                                                                <ul className="max-h-56 overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-lg">
                                                                    {resultados.map((livro) => (
                                                                        <li key={chaveLivro(livro)}>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() =>
                                                                                    selecionarLivroBusca(livro)
                                                                                }
                                                                                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-background"
                                                                            >
                                                                                {mediaUrl(livro.capa_url) ? (
                                                                                    <Image
                                                                                        src={mediaUrl(livro.capa_url)!}
                                                                                        alt={livro.titulo}
                                                                                        width={32}
                                                                                        height={48}
                                                                                        className="h-12 w-8 shrink-0 rounded object-cover"
                                                                                        unoptimized
                                                                                    />
                                                                                ) : (
                                                                                    <div className="flex h-12 w-8 shrink-0 items-center justify-center rounded bg-azul-200 text-sm">
                                                                                        📖
                                                                                    </div>
                                                                                )}
                                                                                <div className="min-w-0">
                                                                                    <p className="truncate font-gabarito-bold text-sm text-azul-900">
                                                                                        {livro.titulo}
                                                                                    </p>
                                                                                    <p className="truncate font-gabarito-regular text-xs text-cinza-700">
                                                                                        {livro.autor ||
                                                                                            "Autor não informado"}
                                                                                    </p>
                                                                                </div>
                                                                            </button>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            )}

                                                            <button
                                                                type="button"
                                                                onClick={iniciarCadastroManual}
                                                                className="flex items-center justify-center gap-2 rounded-full border-2 border-dashed border-azul-600 py-3 font-gabarito-bold text-azul-600 transition hover:bg-azul-50"
                                                            >
                                                                <BookPlus className="h-5 w-5" />
                                                                Cadastrar livro manualmente
                                                            </button>
                                                        </div>
                                                    )}

                                                    <div className="flex flex-col gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setMostrarBusca((v) => !v);
                                                                setErro("");
                                                                if (mostrarBusca) {
                                                                    setBusca("");
                                                                    setResultados([]);
                                                                    setAvisoBusca("");
                                                                }
                                                            }}
                                                            className="rounded-full bg-white px-4 py-2.5 font-gabarito-bold text-sm text-azul-700 ring-1 ring-azul-200 transition hover:bg-azul-50"
                                                        >
                                                            {mostrarBusca
                                                                ? "Voltar para a estante"
                                                                : "Buscar outro livro"}
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}

                                    {passo === 2 && dadosLivro && (
                                        <div className="flex flex-1 flex-col items-center gap-6 py-2">
                                            <motion.div
                                                initial={{ scale: 0.92, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                transition={{ type: "spring", stiffness: 320, damping: 24 }}
                                                className="flex flex-col items-center gap-3 text-center"
                                            >
                                                <CapaHero dados={dadosLivro} tamanho="md" />
                                                <div className="max-w-[280px]">
                                                    <p className="line-clamp-2 font-gabarito-bold text-lg text-azul-900">
                                                        {dadosLivro.titulo}
                                                    </p>
                                                    <p className="font-gabarito-regular text-sm text-cinza-700">
                                                        {dadosLivro.autor}
                                                    </p>
                                                </div>
                                            </motion.div>

                                            <div className="w-full max-w-sm rounded-3xl bg-azul-50/80 px-5 py-6 ring-1 ring-azul-100">
                                                <p className="mb-3 text-center font-gabarito-bold text-sm text-azul-900">
                                                    Sua nota
                                                </p>
                                                <div className="flex justify-center gap-1">
                                                    {[1, 2, 3, 4, 5].map((valor) => (
                                                        <button
                                                            key={valor}
                                                            type="button"
                                                            onMouseEnter={() => setNotaHover(valor)}
                                                            onMouseLeave={() => setNotaHover(0)}
                                                            onClick={() => {
                                                                setNota(valor);
                                                                setErro("");
                                                            }}
                                                            className="rounded p-0.5 transition hover:scale-110"
                                                            aria-label={`Nota ${valor}`}
                                                        >
                                                            <Star
                                                                className={`h-9 w-9 ${
                                                                    valor <= notaExibida
                                                                        ? "fill-amber-400 text-amber-400"
                                                                        : "text-gray-300"
                                                                }`}
                                                            />
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="w-full max-w-sm">
                                                <p className="mb-1 font-gabarito-bold text-sm text-azul-900">
                                                    Modelos de avaliação
                                                </p>
                                                <p className="mb-3 font-gabarito-regular text-xs text-cinza-700">
                                                    Opcional. Escolha um ponto de partida e edite depois.
                                                </p>
                                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                                    {templatesAvaliacao.map((template) => {
                                                        const selecionado = templateSelecionado === template.id;
                                                        const bloqueado = !temTop;
                                                        return (
                                                            <button
                                                                key={template.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    if (bloqueado) {
                                                                        setUpgradeTemplatesAberto(true);
                                                                        return;
                                                                    }
                                                                    setTemplateSelecionado(template.id);
                                                                    setTexto(template.texto);
                                                                    setErro("");
                                                                }}
                                                                className={`rounded-2xl border-2 px-3 py-2.5 text-left transition ${
                                                                    bloqueado
                                                                        ? "cursor-pointer border-cinza-200 bg-cinza-100/80 opacity-70"
                                                                        : selecionado
                                                                          ? "border-azul-600 bg-azul-50"
                                                                          : "border-cinza-200 bg-white hover:border-azul-300 hover:bg-azul-50/40"
                                                                }`}
                                                            >
                                                                <div className="flex items-start justify-between gap-2">
                                                                    <p className="font-gabarito-bold text-sm text-azul-900">
                                                                        {template.nome}
                                                                    </p>
                                                                    {bloqueado ? (
                                                                        <Lock className="h-3.5 w-3.5 shrink-0 text-cinza-500" />
                                                                    ) : null}
                                                                </div>
                                                                <p className="mt-0.5 font-gabarito-regular text-[11px] leading-snug text-cinza-600">
                                                                    {template.descricao}
                                                                </p>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                                {!temTop && (
                                                    <p className="mt-2 font-gabarito-regular text-xs text-cinza-600">
                                                        Modelos exclusivos do{" "}
                                                        <button
                                                            type="button"
                                                            onClick={() => setUpgradeTemplatesAberto(true)}
                                                            className="font-gabarito-bold text-azul-600 underline"
                                                        >
                                                            OpinioTop
                                                        </button>
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {passo === 3 && dadosLivro && (
                                        <div className="flex flex-1 flex-col gap-4 py-2">
                                            <div className="flex items-center gap-3 rounded-2xl bg-azul-50/70 px-3 py-2 ring-1 ring-azul-100">
                                                <CapaHero dados={dadosLivro} tamanho="sm" />
                                                <div className="min-w-0 flex-1">
                                                    <p className="line-clamp-1 font-gabarito-bold text-sm text-azul-900">
                                                        {dadosLivro.titulo}
                                                    </p>
                                                    <div className="mt-0.5 flex items-center gap-0.5">
                                                        {[1, 2, 3, 4, 5].map((valor) => (
                                                            <Star
                                                                key={valor}
                                                                className={`h-3.5 w-3.5 ${
                                                                    valor <= nota
                                                                        ? "fill-amber-400 text-amber-400"
                                                                        : "text-gray-300"
                                                                }`}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between gap-3 rounded-2xl border border-cinza-200 bg-background px-4 py-3">
                                                <div>
                                                    <p className="font-gabarito-bold text-sm text-azul-900">
                                                        Contém spoiler
                                                    </p>
                                                    <p className="font-gabarito-regular text-xs text-cinza-700">
                                                        Oculta texto e mídia no feed até o leitor escolher ver
                                                    </p>
                                                </div>
                                                <Switch
                                                    checked={contemSpoiler}
                                                    onCheckedChange={setContemSpoiler}
                                                    aria-label="Marcar avaliação como contendo spoiler"
                                                />
                                            </div>

                                            <div>
                                                <label
                                                    htmlFor="texto-avaliacao"
                                                    className="mb-2 block font-gabarito-bold text-sm text-azul-900"
                                                >
                                                    Sua avaliação
                                                </label>
                                                <textarea
                                                    id="texto-avaliacao"
                                                    value={texto}
                                                    onChange={(e) => {
                                                        setTexto(e.target.value);
                                                        setErro("");
                                                    }}
                                                    onPaste={(e: ClipboardEvent<HTMLTextAreaElement>) => {
                                                        const items = e.clipboardData?.items;
                                                        if (!items) return;
                                                        for (const item of items) {
                                                            if (
                                                                item.kind === "file" &&
                                                                item.type.startsWith("image/")
                                                            ) {
                                                                const arquivo = item.getAsFile();
                                                                if (!arquivo) continue;
                                                                e.preventDefault();
                                                                definirArquivo(arquivo);
                                                                return;
                                                            }
                                                        }
                                                    }}
                                                    rows={6}
                                                    placeholder="O que você achou do livro? Você pode combinar texto com imagem ou GIF."
                                                    className="w-full resize-none rounded-2xl border-2 border-[#515151] bg-white px-4 py-3 font-gabarito-regular outline-none focus:border-azul-600"
                                                />

                                                {(previewImagem || anexoUrlDireto) && (
                                                    <div className="relative mt-3 w-fit">
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img
                                                            src={previewImagem ?? anexoUrlDireto ?? ""}
                                                            alt="Preview"
                                                            className="max-h-48 max-w-full rounded-xl object-contain"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={limparAnexo}
                                                            className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-azul-900 text-white"
                                                            aria-label="Remover imagem"
                                                        >
                                                            <X className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                )}

                                                <div className="relative mt-2 rounded-2xl border border-cinza-200 bg-white p-2">
                                                    <AnimatePresence>
                                                        {showGifPicker && (
                                                            <motion.div
                                                                key="gif-picker"
                                                                initial={{ opacity: 0, y: 6, scale: 0.98 }}
                                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                                exit={{ opacity: 0, y: 6, scale: 0.98 }}
                                                                transition={{ duration: 0.15, ease: "easeOut" }}
                                                                className="absolute bottom-full left-0 z-50 mb-2 w-full origin-bottom rounded-2xl border border-gray-200 bg-white p-3 shadow-lg"
                                                            >
                                                                <input
                                                                    type="text"
                                                                    value={termoGifBusca}
                                                                    onChange={(e) => {
                                                                        setTermoGifBusca(e.target.value);
                                                                        void buscarGifs(e.target.value.trim());
                                                                    }}
                                                                    placeholder="Buscar GIFs..."
                                                                    className="mb-2 w-full rounded-full border border-cinza-200 px-3 py-1.5 font-gabarito-regular text-xs outline-none focus:border-azul-600"
                                                                />
                                                                <div className="grid max-h-40 grid-cols-3 gap-1.5 overflow-y-auto">
                                                                    {buscandoGifs ? (
                                                                        <div className="col-span-3 flex justify-center py-4">
                                                                            <Loader2 className="h-4 w-4 animate-spin text-azul-600" />
                                                                        </div>
                                                                    ) : gifsGiphy.length === 0 ? (
                                                                        <p className="col-span-3 py-3 text-center font-gabarito-regular text-xs text-cinza-700">
                                                                            Nenhum GIF encontrado.
                                                                        </p>
                                                                    ) : (
                                                                        gifsGiphy.map((gif) => (
                                                                            <button
                                                                                key={gif.id}
                                                                                type="button"
                                                                                onClick={() =>
                                                                                    selecionarGif(
                                                                                        gif.images.original.url,
                                                                                    )
                                                                                }
                                                                                className="overflow-hidden rounded-lg"
                                                                            >
                                                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                                <img
                                                                                    src={gif.images.fixed_height.url}
                                                                                    alt="GIF"
                                                                                    className="h-20 w-full object-cover"
                                                                                />
                                                                            </button>
                                                                        ))
                                                                    )}
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            id={inputImagemId}
                                                            type="file"
                                                            accept="image/*,image/gif"
                                                            className="hidden"
                                                            onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                                                const arquivo = e.target.files?.[0];
                                                                if (arquivo) definirArquivo(arquivo);
                                                                e.target.value = "";
                                                            }}
                                                        />
                                                        <label
                                                            htmlFor={inputImagemId}
                                                            className="cursor-pointer rounded-full p-1.5 text-azul-600 transition hover:bg-azul-50"
                                                            aria-label="Anexar imagem"
                                                        >
                                                            <ImageIcon className="h-4 w-4" />
                                                        </label>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setShowGifPicker((v) => !v);
                                                                if (!showGifPicker && gifsGiphy.length === 0)
                                                                    void buscarGifs("");
                                                            }}
                                                            className="rounded border border-azul-600 px-1.5 py-0.5 font-gabarito-bold text-[10px] text-azul-600"
                                                        >
                                                            GIF
                                                        </button>
                                                        <span className="font-gabarito-regular text-xs text-cinza-600">
                                                            Texto + imagem/GIF na mesma avaliação
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {passo === 4 && dadosLivro && (
                                        <div className="flex flex-1 flex-col items-center justify-center gap-6 py-4">
                                            <motion.div
                                                initial={{ y: 12, opacity: 0 }}
                                                animate={{ y: 0, opacity: 1 }}
                                                transition={{ type: "spring", stiffness: 300, damping: 26 }}
                                                className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-lg ring-1 ring-cinza-200"
                                            >
                                                <div className="bg-gradient-to-br from-azul-600 to-azul-800 px-5 py-4 text-white">
                                                    <p className="font-gabarito-medium text-[11px] uppercase tracking-[0.16em] text-white/70">
                                                        Resumo da avaliação
                                                    </p>
                                                    <p className="mt-1 font-gabarito-bold text-lg">Pronto para publicar</p>
                                                </div>

                                                <div className="flex gap-4 p-5">
                                                    <CapaHero dados={dadosLivro} tamanho="sm" />
                                                    <div className="min-w-0 flex-1">
                                                        <p className="line-clamp-2 font-gabarito-bold text-base text-azul-900">
                                                            {dadosLivro.titulo}
                                                        </p>
                                                        <p className="font-gabarito-regular text-xs text-cinza-700">
                                                            {dadosLivro.autor}
                                                        </p>

                                                        <div className="mt-3 flex items-center gap-1">
                                                            {[1, 2, 3, 4, 5].map((valor) => (
                                                                <Star
                                                                    key={valor}
                                                                    className={`h-4 w-4 ${
                                                                        valor <= nota
                                                                            ? "fill-amber-400 text-amber-400"
                                                                            : "text-gray-300"
                                                                    }`}
                                                                />
                                                            ))}
                                                        </div>

                                                        {texto.trim() ? (
                                                            <p className="mt-3 line-clamp-3 font-gabarito-regular text-xs leading-relaxed text-cinza-700">
                                                                {texto.trim()}
                                                            </p>
                                                        ) : (
                                                            <p className="mt-3 font-gabarito-regular text-xs text-cinza-700">
                                                                Avaliação só com imagem ou GIF
                                                            </p>
                                                        )}

                                                        <div className="mt-3 flex flex-wrap gap-2">
                                                            {contemSpoiler && (
                                                                <span className="rounded-full bg-amber-100 px-2 py-0.5 font-gabarito-bold text-[10px] text-amber-800">
                                                                    Contém spoiler
                                                                </span>
                                                            )}
                                                            {templateAtivo && (
                                                                <span className="rounded-full bg-azul-50 px-2 py-0.5 font-gabarito-bold text-[10px] text-azul-700">
                                                                    {templateAtivo.nome}
                                                                </span>
                                                            )}
                                                            {(previewImagem || anexoUrlDireto) && (
                                                                <span className="rounded-full bg-azul-50 px-2 py-0.5 font-gabarito-bold text-[10px] text-azul-700">
                                                                    Com mídia
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        </div>
                                    )}
                                </motion.div>
                            </AnimatePresence>

                            {erro && (
                                <p className="mt-2 text-center font-gabarito-regular text-sm text-red-600">{erro}</p>
                            )}
                        </div>

                        {mostrarRodape && (
                            <div className="relative z-10 shrink-0 border-t border-cinza-200/80 bg-background/90 px-5 py-4 backdrop-blur-sm sm:px-7">
                                <div className="flex gap-2">
                                    {(passo > 1 || exibirFormularioLivro) && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={() => {
                                                if (passo === 1 && exibirFormularioLivro) {
                                                    limparLivro();
                                                    return;
                                                }
                                                voltar();
                                            }}
                                            disabled={enviando}
                                            className="rounded-full px-4 font-gabarito-bold text-azul-700"
                                        >
                                            <ArrowLeft className="mr-1 h-4 w-4" />
                                            Voltar
                                        </Button>
                                    )}

                                    {passo === 1 && exibirFormularioLivro && (
                                        <Button
                                            type="button"
                                            onClick={avancarDoLivro}
                                            className="flex-1 rounded-full bg-azul-600 py-6 font-gabarito-bold text-base hover:bg-azul-700"
                                        >
                                            Continuar
                                        </Button>
                                    )}

                                    {passo === 2 && (
                                        <Button
                                            type="button"
                                            onClick={avancarDaNota}
                                            disabled={nota < 1}
                                            className="flex-1 rounded-full bg-azul-600 py-6 font-gabarito-bold text-base hover:bg-azul-700 disabled:opacity-50"
                                        >
                                            Continuar
                                        </Button>
                                    )}

                                    {passo === 3 && (
                                        <Button
                                            type="button"
                                            onClick={avancarDaAvaliacao}
                                            className="flex-1 rounded-full bg-azul-600 py-6 font-gabarito-bold text-base hover:bg-azul-700"
                                        >
                                            Continuar
                                        </Button>
                                    )}

                                    {passo === 4 && (
                                        <Button
                                            type="button"
                                            onClick={() => void confirmarPublicacao()}
                                            disabled={enviando}
                                            className="flex-1 rounded-full bg-azul-600 py-6 font-gabarito-bold text-base hover:bg-azul-700"
                                        >
                                            {enviando ? (
                                                <>
                                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                                    Publicando...
                                                </>
                                            ) : (
                                                "Publicar avaliação"
                                            )}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
            <PlanoUpgradeModal
                open={upgradeTemplatesAberto}
                onClose={() => setUpgradeTemplatesAberto(false)}
                recurso="templatesAvaliacao"
            />
        </>
    );
}
