"use client";

import {
    OPCOES_PRIVACIDADE,
    type ConfiguracaoUsuario,
    type NivelPrivacidade,
    type TemaAparencia,
    type VisibilidadePerfil,
} from "@/types/configuracao";
import { Switch } from "@/components/ui/switch";
import {
    ChevronLeft,
    ChevronRight,
    HeartCrack,
    KeyRound,
    Lock,
    type LucideIcon,
    User,
} from "lucide-react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, type ReactNode, Suspense, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { mediaUrl } from "@/lib/media";
import {
    CORES_DESTAQUE,
    coresTextoSobreFundo,
    derivarDestaqueParaTexto,
    derivarTextoSobreDestaque,
    digitosHexDigitados,
    ehHexCor,
    ehPresetCor,
    ehTemaCustom,
    hexDeDigitos,
    hexParaCampo,
    OPCOES_TEMA,
    aplicarTemaNoDocumento,
    resolverFundoContrasteDestaque,
    resolverHexDestaque,
    resolverTomDestaque50,
} from "@/lib/tema";
import { cn } from "@/lib/utils";
import Box from "../components/Box";
import { useConfiguracoes } from "../components/ConfiguracoesProvider";
import MetaLeituraCard from "../components/MetaLeituraCard";
import OpinioWrappedModal from "../components/OpinioWrappedModal";
import PlanoSecao from "../components/PlanoSecao";
import PlanoUpgradeModal from "../components/PlanoUpgradeModal";
import { usePlano } from "../components/PlanoProvider";
import packageJson from "../../package.json";

const SECOES = [
    { id: "conta", rotulo: "Conta" },
    { id: "preferencias", rotulo: "Preferências" },
    { id: "notificacoes", rotulo: "Notificações" },
    { id: "plano", rotulo: "Plano e assinatura" },
    { id: "privacidade", rotulo: "Privacidade" },
    { id: "sobre", rotulo: "Sobre" },
] as const;

type SecaoId = (typeof SECOES)[number]["id"];
type ContaPainel = "lista" | "info" | "email" | "senha" | "desativar";

type ContaPerfil = {
    id?: number;
    nome?: string;
    nick?: string;
    email?: string;
    image?: string;
    status?: string;
    assinaturaId?: number;
    criadoEm?: string;
};

const PLANO_POR_ASSINATURA: Record<number, string> = {
    1: "Gratuito",
    2: "OpinioTop",
    3: "OpinioPro",
};

const selectClass =
    "w-full rounded-full border-2 border-cinza-400 bg-white px-4 py-2 font-gabarito-regular text-sm outline-none focus:border-azul-600";

function formatarDataConta(iso?: string) {
    if (!iso) return "-";
    const data = new Date(iso);
    if (Number.isNaN(data.getTime())) return "-";
    return data.toLocaleDateString("pt-BR", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

function rotuloStatusConta(status?: string) {
    if (status === "ativo") return "Ativa";
    if (status === "inativo") return "Desativada";
    return status?.trim() ? status : "-";
}

function rotuloPlano(assinaturaId?: number) {
    if (assinaturaId == null) return "-";
    return PLANO_POR_ASSINATURA[assinaturaId] ?? `Plano #${assinaturaId}`;
}
function ToggleLinha({
    label,
    descricao,
    checked,
    onChange,
}: {
    label: string;
    descricao?: string;
    checked: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <div className="flex items-center justify-between gap-4 py-3">
            <div className="min-w-0">
                <p className="font-gabarito-medium text-base text-azul-900">{label}</p>
                {descricao ? (
                    <p className="mt-0.5 font-gabarito-regular text-sm text-cinza-700">{descricao}</p>
                ) : null}
            </div>
            <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
        </div>
    );
}

function SelectPrivacidade({
    label,
    value,
    onChange,
}: {
    label: string;
    value: NivelPrivacidade;
    onChange: (v: NivelPrivacidade) => void;
}) {
    return (
        <label className="flex flex-col gap-1.5 py-3">
            <span className="font-gabarito-medium text-base text-azul-900">{label}</span>
            <select
                className={selectClass}
                value={value}
                onChange={(e) => onChange(e.target.value as NivelPrivacidade)}
            >
                {OPCOES_PRIVACIDADE.map((o) => (
                    <option key={o.value} value={o.value}>
                        {o.label}
                    </option>
                ))}
            </select>
        </label>
    );
}

function ContaOpcaoLinha({
    icone: Icone,
    titulo,
    subtitulo,
    onClick,
    perigo = false,
}: {
    icone: LucideIcon;
    titulo: string;
    subtitulo: string;
    onClick: () => void;
    perigo?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex w-full items-start gap-4 rounded-xl px-1 py-4 text-left transition hover:bg-azul-50/80"
        >
            <Icone
                className={`mt-0.5 h-6 w-6 shrink-0 stroke-[1.5] ${
                    perigo ? "text-red-600" : "text-azul-900"
                }`}
                aria-hidden
            />
            <span className="min-w-0 flex-1">
                <span
                    className={`block font-gabarito-semibold text-base ${
                        perigo ? "text-red-700" : "text-azul-900"
                    }`}
                >
                    {titulo}
                </span>
                <span className="mt-0.5 block font-gabarito-regular text-sm leading-snug text-cinza-700">
                    {subtitulo}
                </span>
            </span>
            <ChevronRight
                className="mt-1 h-5 w-5 shrink-0 text-cinza-500"
                aria-hidden
            />
        </button>
    );
}

function ContaDetalheCabecalho({
    titulo,
    onVoltar,
}: {
    titulo: string;
    onVoltar: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onVoltar}
            className="mb-2 inline-flex items-center gap-1 font-gabarito-bold text-xl text-azul-900 transition hover:text-azul-600"
        >
            <ChevronLeft className="h-6 w-6" />
            {titulo}
        </button>
    );
}

function ContaInfoLinha({
    label,
    valor,
    onClick,
    trailing,
}: {
    label: string;
    valor?: string;
    onClick?: () => void;
    trailing?: ReactNode;
}) {
    const corpo = (
        <>
            <span className="min-w-0 flex-1 py-0.5">
                <span className="block font-gabarito-medium text-[15px] text-azul-900">{label}</span>
                {valor ? (
                    <span className="mt-0.5 block font-gabarito-regular text-sm leading-snug text-cinza-700">
                        {valor}
                    </span>
                ) : null}
            </span>
            {trailing}
            {onClick ? (
                <ChevronRight className="mt-1 h-5 w-5 shrink-0 self-center text-cinza-500" aria-hidden />
            ) : null}
        </>
    );

    if (onClick) {
        return (
            <button
                type="button"
                onClick={onClick}
                className="flex w-full items-start gap-3 py-4 text-left transition hover:bg-azul-50/60"
            >
                {corpo}
            </button>
        );
    }

    return <div className="flex w-full items-start gap-3 py-4">{corpo}</div>;
}

function ContaSecao() {
    const { data: session } = useSession();
    const router = useRouter();
    const nick = session?.user?.nick ?? "";
    const emailAtual = session?.user?.email ?? "";

    const [painel, setPainel] = useState<ContaPainel>("lista");
    const [perfil, setPerfil] = useState<ContaPerfil | null>(null);
    const [carregandoPerfil, setCarregandoPerfil] = useState(false);
    const [email, setEmail] = useState(emailAtual);
    const [senhaAtual, setSenhaAtual] = useState("");
    const [novaSenha, setNovaSenha] = useState("");
    const [confirmar, setConfirmar] = useState("");
    const [apagarConfirmacao, setApagarConfirmacao] = useState("");
    const [modalDesativarAberto, setModalDesativarAberto] = useState(false);
    const [salvando, setSalvando] = useState(false);

    useEffect(() => {
        setEmail(emailAtual);
    }, [emailAtual]);

    useEffect(() => {
        if ((painel !== "info" && painel !== "email") || !nick) return;

        let cancelado = false;
        setCarregandoPerfil(true);
        void fetch(`/api/usuarios/${encodeURIComponent(nick)}`)
            .then(async (res) => {
                if (!res.ok) return null;
                return (await res.json()) as ContaPerfil;
            })
            .then((dados) => {
                if (cancelado || !dados) return;
                setPerfil(dados);
                if (dados.email) setEmail(dados.email);
            })
            .finally(() => {
                if (!cancelado) setCarregandoPerfil(false);
            });

        return () => {
            cancelado = true;
        };
    }, [painel, nick]);

    function voltarLista() {
        setPainel("lista");
        setModalDesativarAberto(false);
        setApagarConfirmacao("");
    }

    async function salvarEmail(e: FormEvent) {
        e.preventDefault();
        if (!nick) return;
        setSalvando(true);
        try {
            const perfilRes = await fetch(`/api/usuarios/${encodeURIComponent(nick)}`);
            const perfilAtual = perfilRes.ok ? ((await perfilRes.json()) as ContaPerfil) : null;
            const res = await fetch(`/api/usuarios/${encodeURIComponent(nick)}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    nome: perfilAtual?.nome ?? perfil?.nome ?? session?.user?.name ?? nick,
                    nick,
                    email,
                    image: perfilAtual?.image ?? perfil?.image ?? "",
                }),
            });
            if (!res.ok) {
                toast.error("Não foi possível atualizar o e-mail.");
                return;
            }
            setPerfil((atual) => (atual ? { ...atual, email } : { email, nick, nome: session?.user?.name ?? nick }));
            toast.success("E-mail atualizado.");
            setPainel("info");
        } finally {
            setSalvando(false);
        }
    }

    async function alterarSenha(e: FormEvent) {
        e.preventDefault();
        if (novaSenha !== confirmar) {
            toast.error("As senhas não coincidem.");
            return;
        }
        setSalvando(true);
        try {
            const res = await fetch(`/api/usuarios/${encodeURIComponent(nick)}/atualizar-senha`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ atual: senhaAtual, nova: novaSenha }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => null);
                toast.error(data?.erro ?? "Não foi possível alterar a senha.");
                return;
            }
            toast.success("Senha alterada.");
            setSenhaAtual("");
            setNovaSenha("");
            setConfirmar("");
        } finally {
            setSalvando(false);
        }
    }

    async function apagarConta() {
        if (apagarConfirmacao !== nick) {
            toast.error("Digite seu nick para confirmar.");
            return;
        }
        setSalvando(true);
        try {
            const res = await fetch(`/api/usuarios/${encodeURIComponent(nick)}`, { method: "DELETE" });
            if (!res.ok && res.status !== 204) {
                toast.error("Não foi possível desativar a conta.");
                return;
            }
            setModalDesativarAberto(false);
            toast.success("Conta desativada. Você tem 30 dias para reativar.");
            router.push("/");
            router.refresh();
        } finally {
            setSalvando(false);
        }
    }

    if (painel === "email") {
        return (
            <div>
                <ContaDetalheCabecalho titulo="E-mail" onVoltar={() => setPainel("info")} />
                <form onSubmit={salvarEmail} className="mt-4 flex flex-col gap-3">
                    <p className="font-gabarito-regular text-sm text-cinza-700">
                        Atualize o endereço de e-mail da sua conta.
                    </p>
                    <label className="flex flex-col gap-1.5">
                        <span className="font-gabarito-medium text-sm text-azul-900">E-mail</span>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={selectClass}
                            required
                        />
                    </label>
                    <button
                        type="submit"
                        disabled={salvando}
                        className="self-start rounded-full bg-azul-600 px-5 py-2 font-gabarito-bold text-sm text-white hover:bg-azul-700 disabled:opacity-60"
                    >
                        Salvar e-mail
                    </button>
                </form>
            </div>
        );
    }

    if (painel === "info") {
        const nickExibido = perfil?.nick ?? nick;
        const nomeExibido = perfil?.nome ?? session?.user?.name ?? "";
        const emailExibido = perfil?.email ?? emailAtual;
        const avatarSrc = mediaUrl(perfil?.image ?? session?.user?.image);
        const inicial = (nomeExibido || nickExibido || "?").charAt(0).toUpperCase();

        return (
            <div>
                <ContaDetalheCabecalho titulo="Informações da Conta" onVoltar={voltarLista} />
                {carregandoPerfil && !perfil ? (
                    <p className="mt-4 font-gabarito-regular text-sm text-cinza-700">Carregando…</p>
                ) : (
                    <div className="mt-1 flex flex-col">
                        <div className="divide-y divide-cinza-200">
                            <ContaInfoLinha
                                label="Nome de usuário"
                                valor={nickExibido ? `@${nickExibido}` : "-"}
                            />
                            <ContaInfoLinha label="Nome" valor={nomeExibido || "-"} />
                            <ContaInfoLinha
                                label="E-mail"
                                valor={emailExibido || undefined}
                                onClick={() => setPainel("email")}
                            />
                            <ContaInfoLinha
                                label="Foto de perfil"
                                valor={avatarSrc ? undefined : "Nenhuma foto"}
                                trailing={
                                    avatarSrc ? (
                                        <Image
                                            src={avatarSrc}
                                            alt=""
                                            width={36}
                                            height={36}
                                            unoptimized
                                            className="mt-0.5 h-9 w-9 shrink-0 rounded-full object-cover"
                                        />
                                    ) : (
                                        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-azul-100 font-gabarito-bold text-sm text-azul-800">
                                            {inicial}
                                        </span>
                                    )
                                }
                            />
                        </div>
                        <div className="mt-2 border-t border-cinza-200">
                            <div className="divide-y divide-cinza-200">
                                <ContaInfoLinha
                                    label="Criação de conta"
                                    valor={formatarDataConta(perfil?.criadoEm)}
                                />
                                <ContaInfoLinha
                                    label="Status"
                                    valor={rotuloStatusConta(perfil?.status)}
                                />
                                <ContaInfoLinha
                                    label="Plano"
                                    valor={rotuloPlano(perfil?.assinaturaId)}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (painel === "senha") {
        return (
            <div>
                <ContaDetalheCabecalho titulo="Altere sua senha" onVoltar={voltarLista} />
                <form onSubmit={alterarSenha} className="flex flex-col gap-3">
                    <p className="mb-1 font-gabarito-regular text-sm text-cinza-700">
                        Altere a senha a qualquer momento.
                    </p>
                    <input
                        type="password"
                        placeholder="Senha atual"
                        value={senhaAtual}
                        onChange={(e) => setSenhaAtual(e.target.value)}
                        className={selectClass}
                        required
                    />
                    <input
                        type="password"
                        placeholder="Nova senha"
                        value={novaSenha}
                        onChange={(e) => setNovaSenha(e.target.value)}
                        className={selectClass}
                        required
                    />
                    <input
                        type="password"
                        placeholder="Confirmar nova senha"
                        value={confirmar}
                        onChange={(e) => setConfirmar(e.target.value)}
                        className={selectClass}
                        required
                    />
                    <button
                        type="submit"
                        disabled={salvando}
                        className="self-start rounded-full bg-azul-600 px-5 py-2 font-gabarito-bold text-sm text-white hover:bg-azul-700 disabled:opacity-60"
                    >
                        Alterar senha
                    </button>
                </form>
            </div>
        );
    }

    if (painel === "desativar") {
        return (
            <div>
                <ContaDetalheCabecalho titulo="Desative sua conta" onVoltar={voltarLista} />
                <div className="flex flex-col gap-4">
                    <p className="font-gabarito-regular text-sm leading-relaxed text-cinza-700">
                        Sua conta será desativada. Você pode reativá-la em até 30 dias com o mesmo
                        nick e senha. Depois disso, o login fica bloqueado; interações antigas
                        continuam mostrando “conta apagada”.
                    </p>
                    <button
                        type="button"
                        onClick={() => {
                            setApagarConfirmacao("");
                            setModalDesativarAberto(true);
                        }}
                        className="self-start rounded-full bg-red-600 px-5 py-2 font-gabarito-bold text-sm text-white hover:bg-red-700"
                    >
                        Desativar minha conta
                    </button>
                </div>

                {modalDesativarAberto ? (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="desativar-conta-titulo"
                    >
                        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
                            <h3
                                id="desativar-conta-titulo"
                                className="font-gabarito-bold text-lg text-azul-900"
                            >
                                Confirmar desativação
                            </h3>
                            <p className="mt-2 font-gabarito-regular text-sm text-cinza-700">
                                Digite seu nick <span className="font-gabarito-bold">{nick}</span>{" "}
                                para confirmar. Você terá 30 dias para reativar a conta.
                            </p>
                            <input
                                type="text"
                                placeholder={`Digite ${nick} para confirmar`}
                                value={apagarConfirmacao}
                                onChange={(e) => setApagarConfirmacao(e.target.value)}
                                className={`${selectClass} mt-4`}
                                autoFocus
                            />
                            <div className="mt-5 flex flex-wrap justify-end gap-2">
                                <button
                                    type="button"
                                    disabled={salvando}
                                    onClick={() => {
                                        setModalDesativarAberto(false);
                                        setApagarConfirmacao("");
                                    }}
                                    className="rounded-full px-5 py-2 font-gabarito-medium text-sm text-azul-800 hover:bg-azul-100 disabled:opacity-60"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    disabled={salvando}
                                    onClick={() => void apagarConta()}
                                    className="rounded-full bg-red-600 px-5 py-2 font-gabarito-bold text-sm text-white hover:bg-red-700 disabled:opacity-60"
                                >
                                    Desativar conta
                                </button>
                            </div>
                        </div>
                    </div>
                ) : null}
            </div>
        );
    }

    return (
        <div>
            <h2 className="font-gabarito-bold text-2xl text-azul-900">Sua conta</h2>
            <p className="mt-2 max-w-xl font-gabarito-regular text-sm leading-relaxed text-cinza-700">
                Veja as informações da conta, altere sua senha ou saiba mais sobre como desativar a
                conta.
            </p>
            <div className="mt-4 flex flex-col">
                <ContaOpcaoLinha
                    icone={User}
                    titulo="Informações da conta"
                    subtitulo="Veja as informações da sua conta, como nick, nome e e-mail."
                    onClick={() => setPainel("info")}
                />
                <ContaOpcaoLinha
                    icone={KeyRound}
                    titulo="Altere sua senha"
                    subtitulo="Altere a senha a qualquer momento."
                    onClick={() => setPainel("senha")}
                />
                <ContaOpcaoLinha
                    icone={HeartCrack}
                    titulo="Desative sua conta"
                    subtitulo="Descubra como desativar sua conta."
                    onClick={() => setPainel("desativar")}
                    perigo
                />
            </div>
        </div>
    );
}

/** Campo de cor: picker + # fixo + digitos hex (cola com # e remove). */
function CampoCorHex({
    valor,
    fallback,
    disabled,
    onHex,
    ariaLabelPicker,
    ariaLabelHex,
    onRestore,
    showRestore,
    pickerClassName = "h-9 w-12",
}: {
    valor: string | null | undefined;
    fallback: string;
    disabled?: boolean;
    onHex: (hex: string) => void;
    ariaLabelPicker: string;
    ariaLabelHex: string;
    onRestore?: () => void;
    showRestore?: boolean;
    pickerClassName?: string;
}) {
    const efetivo = valor && ehHexCor(valor) ? valor : fallback;
    const [digitos, setDigitos] = useState(() => hexParaCampo(efetivo));

    useEffect(() => {
        setDigitos(hexParaCampo(valor && ehHexCor(valor) ? valor : fallback));
    }, [valor, fallback]);

    return (
        <div className="flex flex-wrap items-center gap-2">
            <input
                type="color"
                value={efetivo.toLowerCase()}
                disabled={disabled}
                onChange={(e) => {
                    if (disabled) return;
                    const hex = e.target.value.toLowerCase();
                    setDigitos(hexParaCampo(hex));
                    onHex(hex);
                }}
                className={cn(
                    "cursor-pointer rounded border border-cinza-200 bg-transparent disabled:cursor-not-allowed",
                    pickerClassName,
                )}
                aria-label={ariaLabelPicker}
            />
            <div
                className={cn(
                    "flex items-center rounded-lg border border-cinza-200 bg-superficie",
                    disabled && "opacity-70",
                )}
            >
                <span
                    className="select-none pl-2 font-gabarito-regular text-sm text-cinza-700"
                    aria-hidden
                >
                    #
                </span>
                <input
                    type="text"
                    value={digitos}
                    disabled={disabled}
                    maxLength={6}
                    spellCheck={false}
                    autoComplete="off"
                    placeholder={hexParaCampo(fallback)}
                    onChange={(e) => {
                        if (disabled) return;
                        const d = digitosHexDigitados(e.target.value);
                        setDigitos(d);
                        const completo = hexDeDigitos(d);
                        if (completo) onHex(completo);
                    }}
                    className="w-[4.75rem] border-0 bg-transparent py-1.5 pr-2 pl-0.5 font-gabarito-regular text-sm text-azul-900 outline-none disabled:cursor-not-allowed"
                    aria-label={ariaLabelHex}
                />
            </div>
            {showRestore && onRestore ? (
                <button
                    type="button"
                    className="font-gabarito-regular text-xs text-azul-600 underline"
                    onClick={onRestore}
                >
                    Restaurar
                </button>
            ) : null}
        </div>
    );
}

function PreferenciasSecao() {
    const { config, salvar } = useConfiguracoes();
    const { modoZen, temPlanoPro, alternarModoZen } = usePlano();
    const [ctaZenAberto, setCtaZenAberto] = useState(false);
    const [ctaWrappedAberto, setCtaWrappedAberto] = useState(false);
    const [ctaTemaAberto, setCtaTemaAberto] = useState(false);
    const [wrappedAberto, setWrappedAberto] = useState(false);
    const corDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const temaAtual = (config.tema ?? "claro") as TemaAparencia;
    const customAtivo = ehTemaCustom(temaAtual);
    const hexAtual = resolverHexDestaque(config.corDestaque, temaAtual);
    const hexPicker =
        ehHexCor(config.corDestaque) ? config.corDestaque : hexAtual;
    const presetAtivo = ehPresetCor(config.corDestaque) ? config.corDestaque : null;
    const coresCardTemaAtivo = coresTextoSobreFundo(
        resolverTomDestaque50({
            tema: temaAtual,
            corDestaque: config.corDestaque ?? "azul",
            corFundoTexto: config.corFundoTexto ?? null,
            corSuperficie: config.corSuperficie ?? null,
            corTexto: config.corTexto ?? null,
            corHover: config.corHover ?? null,
        }),
    );
    const prefPreview = {
        tema: temaAtual,
        corDestaque: config.corDestaque ?? "azul",
        corFundoTexto: config.corFundoTexto ?? null,
        corSuperficie: config.corSuperficie ?? null,
        corTexto: config.corTexto ?? null,
        corHover: config.corHover ?? null,
    };
    const onAccentPreview = derivarTextoSobreDestaque(hexAtual);
    const textoDestaquePreview = derivarDestaqueParaTexto(
        hexAtual,
        resolverFundoContrasteDestaque(prefPreview),
    );
    const fundoPreview = (config.corFundoTexto && ehHexCor(config.corFundoTexto)
        ? config.corFundoTexto
        : "#E8EAED"
    ).toUpperCase();
    const superficiePreview = (config.corSuperficie && ehHexCor(config.corSuperficie)
        ? config.corSuperficie
        : "#FFFFFF"
    ).toUpperCase();
    const hoverPreview = (config.corHover && ehHexCor(config.corHover)
        ? config.corHover
        : "#E8EFFF"
    ).toUpperCase();

    function prefCom(parcial: Partial<ConfiguracaoUsuario>) {
        return {
            tema: (parcial.tema ?? config.tema ?? "claro") as TemaAparencia,
            corDestaque: parcial.corDestaque ?? config.corDestaque ?? "azul",
            corFundoTexto:
                parcial.corFundoTexto !== undefined ? parcial.corFundoTexto : (config.corFundoTexto ?? null),
            corSuperficie:
                parcial.corSuperficie !== undefined ? parcial.corSuperficie : (config.corSuperficie ?? null),
            corTexto: parcial.corTexto !== undefined ? parcial.corTexto : (config.corTexto ?? null),
            corHover: parcial.corHover !== undefined ? parcial.corHover : (config.corHover ?? null),
        };
    }

    /** Edição do pack custom ativa o tema Personalizado (Pro) e limpa cor de texto manual. */
    function comTemaCustomSePro(parcial: Partial<ConfiguracaoUsuario>): Partial<ConfiguracaoUsuario> {
        if (!temPlanoPro) return parcial;
        if (parcial.tema !== undefined) return parcial;
        return { ...parcial, tema: "custom", corTexto: null };
    }

    async function atualizar(parcial: Partial<ConfiguracaoUsuario>) {
        aplicarTemaNoDocumento(prefCom(parcial));
        const ok = await salvar(parcial);
        if (ok) toast.success("Preferência salva.");
        else toast.error("Não foi possível salvar.");
    }

    function salvarCorDebounced(parcial: Partial<ConfiguracaoUsuario>) {
        const payload = comTemaCustomSePro(parcial);
        aplicarTemaNoDocumento(prefCom(payload));
        if (corDebounceRef.current) clearTimeout(corDebounceRef.current);
        corDebounceRef.current = setTimeout(async () => {
            const ok = await salvar(payload);
            if (ok) toast.success("Preferência salva.");
            else toast.error("Não foi possível salvar.");
        }, 250);
    }

    async function toggleZen(checked: boolean) {
        if (!temPlanoPro) {
            setCtaZenAberto(true);
            return;
        }
        const ok = await alternarModoZen();
        if (ok) {
            toast.success(checked ? "Modo Zen ativado." : "Modo Zen desativado.");
        } else {
            toast.error("Não foi possível alterar o Modo Zen.");
        }
    }

    function exigirPro() {
        setCtaTemaAberto(true);
    }

    function selecionarTema(id: TemaAparencia) {
        if (id === "custom" && !temPlanoPro) {
            exigirPro();
            return;
        }
        void atualizar({ tema: id });
    }

    return (
        <div className="flex flex-col gap-6">
            <section className="flex flex-col gap-4">
                <div>
                    <h3 className="font-gabarito-bold text-lg text-azul-900">Aparência</h3>
                    <p className="mt-0.5 font-gabarito-regular text-sm text-cinza-700">
                        Tema e cor de destaque da interface.
                    </p>
                </div>

                <div>
                    <p className="mb-2 font-gabarito-medium text-sm text-azul-900">Tema</p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        {OPCOES_TEMA.map((opcao) => {
                            const ativo = config.tema === opcao.id;
                            const bloqueado = !!opcao.pro && !temPlanoPro;
                            return (
                                <button
                                    key={opcao.id}
                                    type="button"
                                    onClick={() => selecionarTema(opcao.id)}
                                    className={cn(
                                        "rounded-xl border px-3 py-3 text-left transition",
                                        ativo
                                            ? "border-azul-600 bg-azul-50 ring-2 ring-azul-600/30"
                                            : "border-cinza-200 hover:border-azul-400",
                                        bloqueado && "opacity-70",
                                    )}
                                >
                                    <span
                                        className={cn(
                                            "flex items-center gap-1.5 font-gabarito-bold text-sm",
                                            !ativo && "text-texto",
                                        )}
                                        style={ativo ? { color: coresCardTemaAtivo.titulo } : undefined}
                                    >
                                        {opcao.label}
                                        {opcao.pro ? (
                                            <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                        ) : null}
                                    </span>
                                    <span
                                        className={cn(
                                            "mt-0.5 block font-gabarito-regular text-xs",
                                            !ativo && "text-muted-foreground",
                                        )}
                                        style={ativo ? { color: coresCardTemaAtivo.subtitulo } : undefined}
                                    >
                                        {opcao.descricao}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div>
                    <p className="mb-2 font-gabarito-medium text-sm text-azul-900">Cor de destaque</p>
                    <p className="mb-2 font-gabarito-regular text-xs text-cinza-700">
                        Presets valem em qualquer tema.
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                        {CORES_DESTAQUE.map((cor) => {
                            const ativo = presetAtivo === cor.id;
                            return (
                                <button
                                    key={cor.id}
                                    type="button"
                                    title={cor.label}
                                    aria-label={cor.label}
                                    aria-pressed={ativo}
                                    onClick={() => void atualizar({ corDestaque: cor.id })}
                                    className={cn(
                                        "h-9 w-9 rounded-full border-2 transition",
                                        ativo ? "border-azul-900 scale-110" : "border-transparent hover:scale-105",
                                    )}
                                    style={{ backgroundColor: cor.hex }}
                                />
                            );
                        })}
                    </div>
                </div>

                <div
                    className={cn(
                        "rounded-xl border p-3",
                        customAtivo ? "border-azul-600 ring-1 ring-azul-600/20" : "border-cinza-200",
                    )}
                >
                    <div className="flex items-center justify-between gap-2">
                        <div>
                            <p className="font-gabarito-medium text-sm text-azul-900">Cores personalizadas</p>
                            <p className="font-gabarito-regular text-xs text-cinza-700">
                                {customAtivo
                                    ? "Ativas no tema Personalizado."
                                    : "Salvas sempre; só entram em vigor no tema Personalizado."}
                            </p>
                            <p className="mt-0.5 font-gabarito-regular text-xs text-cinza-700">
                                Texto da interface e texto sobre o destaque ajustados automaticamente ao contraste.
                            </p>
                        </div>
                        {!temPlanoPro ? (
                            <button
                                type="button"
                                onClick={exigirPro}
                                className="flex items-center gap-1.5 rounded-full border border-cinza-200 px-3 py-1.5 font-gabarito-medium text-xs text-cinza-700"
                            >
                                <Lock className="h-3.5 w-3.5" />
                                OpinioPro
                            </button>
                        ) : null}
                    </div>
                    <div
                        className={cn("mt-3 flex items-center gap-3", !temPlanoPro && "opacity-50")}
                        onClick={!temPlanoPro ? exigirPro : undefined}
                        onKeyDown={undefined}
                        role={!temPlanoPro ? "button" : undefined}
                    >
                        <CampoCorHex
                            valor={ehHexCor(config.corDestaque) ? config.corDestaque : hexPicker}
                            fallback={hexPicker}
                            disabled={!temPlanoPro}
                            onHex={(hex) => salvarCorDebounced({ corDestaque: hex })}
                            ariaLabelPicker="Escolher cor de destaque personalizada"
                            ariaLabelHex="Hexadecimal da cor de destaque"
                            pickerClassName="h-10 w-14"
                        />
                        <span className="font-gabarito-regular text-xs text-cinza-700">Destaque (hex)</span>
                    </div>

                    <div className={cn("mt-4 grid gap-3 sm:grid-cols-2", !temPlanoPro && "opacity-50")}>
                        <label className="flex flex-col gap-1.5">
                            <span className="font-gabarito-medium text-xs text-azul-900">
                                Fundo do texto
                            </span>
                            <div
                                onClick={!temPlanoPro ? exigirPro : undefined}
                                role={!temPlanoPro ? "button" : undefined}
                            >
                                <CampoCorHex
                                    valor={config.corFundoTexto}
                                    fallback="#E8EAED"
                                    disabled={!temPlanoPro}
                                    onHex={(hex) => salvarCorDebounced({ corFundoTexto: hex })}
                                    ariaLabelPicker="Cor de fundo do texto"
                                    ariaLabelHex="Hexadecimal do fundo do texto"
                                    showRestore={temPlanoPro && !!config.corFundoTexto}
                                    onRestore={() =>
                                        void atualizar(comTemaCustomSePro({ corFundoTexto: null }))
                                    }
                                />
                            </div>
                        </label>
                        <label className="flex flex-col gap-1.5">
                            <span className="font-gabarito-medium text-xs text-azul-900">
                                Superfície de leitura
                            </span>
                            <div
                                onClick={!temPlanoPro ? exigirPro : undefined}
                                role={!temPlanoPro ? "button" : undefined}
                            >
                                <CampoCorHex
                                    valor={config.corSuperficie}
                                    fallback="#FFFFFF"
                                    disabled={!temPlanoPro}
                                    onHex={(hex) => salvarCorDebounced({ corSuperficie: hex })}
                                    ariaLabelPicker="Cor da superfície de leitura"
                                    ariaLabelHex="Hexadecimal da superfície de leitura"
                                    showRestore={temPlanoPro && !!config.corSuperficie}
                                    onRestore={() =>
                                        void atualizar(comTemaCustomSePro({ corSuperficie: null }))
                                    }
                                />
                            </div>
                        </label>
                        <label className="flex flex-col gap-1.5">
                            <span className="font-gabarito-medium text-xs text-azul-900">
                                Cor de hover
                            </span>
                            <div
                                onClick={!temPlanoPro ? exigirPro : undefined}
                                role={!temPlanoPro ? "button" : undefined}
                            >
                                <CampoCorHex
                                    valor={config.corHover}
                                    fallback="#E8EFFF"
                                    disabled={!temPlanoPro}
                                    onHex={(hex) => salvarCorDebounced({ corHover: hex })}
                                    ariaLabelPicker="Cor de hover"
                                    ariaLabelHex="Hexadecimal da cor de hover"
                                    showRestore={temPlanoPro && !!config.corHover}
                                    onRestore={() =>
                                        void atualizar(comTemaCustomSePro({ corHover: null }))
                                    }
                                />
                            </div>
                        </label>
                    </div>

                    <div
                        className={cn(
                            "mt-3 grid gap-2 sm:grid-cols-3",
                            !temPlanoPro && "opacity-50",
                        )}
                    >
                        <div
                            className="rounded-lg border border-cinza-200 px-3 py-2"
                            style={{ backgroundColor: fundoPreview }}
                        >
                            <p className="font-gabarito-regular text-[10px] text-cinza-700">
                                Fundo do texto
                            </p>
                            <p
                                className="mt-1 font-gabarito-bold text-sm"
                                style={{ color: textoDestaquePreview }}
                            >
                                Texto aqui
                            </p>
                        </div>
                        <div
                            className="rounded-lg border border-cinza-200 px-3 py-2"
                            style={{ backgroundColor: superficiePreview }}
                        >
                            <p className="font-gabarito-regular text-[10px] text-cinza-700">
                                Superfície de leitura
                            </p>
                            <p
                                className="mt-1 font-gabarito-bold text-sm"
                                style={{ color: textoDestaquePreview }}
                            >
                                Texto aqui
                            </p>
                        </div>
                        <div
                            className="rounded-lg border border-cinza-200 px-3 py-2"
                            style={{ backgroundColor: hoverPreview }}
                        >
                            <p className="font-gabarito-regular text-[10px] text-cinza-700">
                                Cor de hover
                            </p>
                            <p
                                className="mt-1 font-gabarito-bold text-sm"
                                style={{ color: textoDestaquePreview }}
                            >
                                Texto aqui
                            </p>
                        </div>
                        <div
                            className="rounded-lg px-3 py-2 sm:col-span-3"
                            style={{
                                backgroundColor: hexAtual,
                                color: onAccentPreview,
                            }}
                        >
                            <p className="font-gabarito-regular text-[10px] opacity-80">
                                Botão / nav ativa
                            </p>
                            <p className="mt-1 font-gabarito-bold text-sm">Texto aqui</p>
                        </div>
                    </div>
                </div>
            </section>

            <div className="divide-y divide-cinza-200">
                <ToggleLinha
                    label="Ocultar spoilers por padrão"
                    descricao="Esconde trechos marcados como spoiler até você revelar."
                    checked={config.ocultarSpoilersPadrao}
                    onChange={(v) => void atualizar({ ocultarSpoilersPadrao: v })}
                />
                <ToggleLinha
                    label="Mostrar streak"
                    descricao="Exibe sua sequência de leitura no menu e no perfil."
                    checked={config.mostrarStreak}
                    onChange={(v) => void atualizar({ mostrarStreak: v })}
                />
                <ToggleLinha
                    label="Modo Zen"
                    descricao="Esconde streak, descobertas e atalhos flutuantes para focar na leitura."
                    checked={modoZen}
                    onChange={(v) => void toggleZen(v)}
                />
            </div>

            <MetaLeituraCard />

            <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-azul-50 p-4">
                <p className="font-gabarito-bold text-base text-azul-900">OpinioWrapped</p>
                <p className="mt-1 font-gabarito-regular text-sm text-cinza-700">
                    Seu ano em leitura: estatísticas dos últimos 12 meses.
                </p>
                <button
                    type="button"
                    onClick={() => {
                        if (!temPlanoPro) {
                            setCtaWrappedAberto(true);
                            return;
                        }
                        setWrappedAberto(true);
                    }}
                    className="mt-3 rounded-full bg-gradient-to-r from-violet-600 to-azul-600 px-4 py-2 font-gabarito-bold text-sm text-white"
                >
                    {temPlanoPro ? "Ver meu Wrapped" : "Conhecer OpinioPro"}
                </button>
            </div>

            <PlanoUpgradeModal open={ctaZenAberto} onClose={() => setCtaZenAberto(false)} recurso="modoZen" />
            <PlanoUpgradeModal open={ctaWrappedAberto} onClose={() => setCtaWrappedAberto(false)} recurso="opinioWrapped" />
            <PlanoUpgradeModal open={ctaTemaAberto} onClose={() => setCtaTemaAberto(false)} recurso="temasCustom" />
            <OpinioWrappedModal open={wrappedAberto} onClose={() => setWrappedAberto(false)} />
        </div>
    );
}

function NotificacoesSecao() {
    const { config, salvar } = useConfiguracoes();

    async function atualizar(parcial: Partial<ConfiguracaoUsuario>) {
        const ok = await salvar(parcial);
        if (ok) toast.success("Preferência salva.");
        else toast.error("Não foi possível salvar.");
    }

    return (
        <div className="divide-y divide-cinza-200">
            <ToggleLinha
                label="Novo seguidor"
                descricao="Quando alguém começa a seguir você."
                checked={config.notifSeguidor}
                onChange={(v) => void atualizar({ notifSeguidor: v })}
            />
            <ToggleLinha
                label="Comentários"
                checked={config.notifComentario}
                onChange={(v) => void atualizar({ notifComentario: v })}
            />
            <ToggleLinha
                label="Votos nas avaliações"
                checked={config.notifVotos}
                onChange={(v) => void atualizar({ notifVotos: v })}
            />
            <ToggleLinha
                label="Mensagens"
                checked={config.notifMensagens}
                onChange={(v) => void atualizar({ notifMensagens: v })}
            />
        </div>
    );
}

function PrivacidadeSecao() {
    const { config, salvar } = useConfiguracoes();

    async function atualizar(parcial: Partial<ConfiguracaoUsuario>) {
        const ok = await salvar(parcial);
        if (ok) toast.success("Privacidade atualizada.");
        else toast.error("Não foi possível salvar.");
    }

    return (
        <div className="flex flex-col divide-y divide-cinza-200">
            <label className="flex flex-col gap-1.5 py-3">
                <span className="font-gabarito-medium text-base text-azul-900">Visibilidade do perfil</span>
                <select
                    className={selectClass}
                    value={config.visibilidadePerfil}
                    onChange={(e) =>
                        void atualizar({ visibilidadePerfil: e.target.value as VisibilidadePerfil })
                    }
                >
                    <option value="publico">Público</option>
                    <option value="privado">Privado</option>
                </select>
                <span className="font-gabarito-regular text-sm text-cinza-700">
                    Perfil privado: visitantes veem só foto, nick e um aviso.
                </span>
            </label>
            <SelectPrivacidade
                label="Quem pode te enviar mensagem"
                value={config.mensagemDe}
                onChange={(v) => void atualizar({ mensagemDe: v })}
            />
            <SelectPrivacidade
                label="Quem pode ver seu streak"
                value={config.streakVisivelPara}
                onChange={(v) => void atualizar({ streakVisivelPara: v })}
            />
            <SelectPrivacidade
                label="Quem pode ver seu histórico de leitura"
                value={config.historicoVisivelPara}
                onChange={(v) => void atualizar({ historicoVisivelPara: v })}
            />
        </div>
    );
}

function ConfiguracoesConteudo() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const secaoParam = (searchParams.get("secao") as SecaoId | null) ?? "conta";
    const secao = SECOES.some((s) => s.id === secaoParam) ? secaoParam : "conta";

    function irPara(id: SecaoId) {
        router.replace(`/configuracoes?secao=${id}`);
    }

    return (
        <div className="flex w-full min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:gap-4 xl:gap-6 2xl:gap-8">
            <aside className="w-full shrink-0 lg:sticky lg:top-16 lg:w-56 xl:w-64 2xl:w-72">
                <Box className="flex flex-col gap-1.5 !p-3 sm:!p-3.5">
                    <h1 className="px-3 py-2.5 font-gabarito-bold text-lg text-azul-900 sm:text-xl">
                        Configurações
                    </h1>
                    <nav className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 scrollbar-thin lg:flex-col lg:overflow-visible lg:pb-0">
                        {SECOES.map((s) => (
                            <button
                                key={s.id}
                                type="button"
                                onClick={() => irPara(s.id)}
                                className={`shrink-0 rounded-xl px-4 py-3 text-left font-gabarito-medium text-sm transition sm:px-4 sm:py-3.5 sm:text-base ${
                                    secao === s.id
                                        ? "bg-azul-600 text-azul-600-foreground"
                                        : "text-azul-800 hover:bg-azul-100"
                                }`}
                            >
                                {s.rotulo}
                            </button>
                        ))}
                    </nav>
                </Box>
            </aside>

            <Box className="min-w-0 flex-1 !p-5 sm:!p-6 lg:!p-8">
                {secao !== "conta" ? (
                    <h2 className="mb-4 font-gabarito-bold text-2xl text-azul-900">
                        {SECOES.find((s) => s.id === secao)?.rotulo}
                    </h2>
                ) : null}
                {secao === "conta" && <ContaSecao />}
                {secao === "preferencias" && <PreferenciasSecao />}
                {secao === "notificacoes" && <NotificacoesSecao />}
                {secao === "plano" && <PlanoSecao />}
                {secao === "privacidade" && <PrivacidadeSecao />}
                {secao === "sobre" && (
                    <div className="flex flex-col gap-3 font-gabarito-regular text-azul-900">
                        <a href="/termos" className="text-azul-700 hover:underline">
                            Termos de uso
                        </a>
                        <a href="/privacidade" className="text-azul-700 hover:underline">
                            Política de privacidade
                        </a>
                        <p className="text-cinza-700">Versão {packageJson.version}</p>
                    </div>
                )}
            </Box>
        </div>
    );
}

export default function ConfiguracoesPage() {
    return (
        <Suspense fallback={<p className="p-4 font-gabarito-regular text-cinza-700">Carregando…</p>}>
            <ConfiguracoesConteudo />
        </Suspense>
    );
}
