"use client";

import Box from "@/app/components/Box";
import AdminPageHeader, { AdminNovoButton } from "@/app/components/admin/AdminPageHeader";
import AdminPaginacao from "@/app/components/admin/AdminPaginacao";
import AdminTable from "@/app/components/admin/AdminTable";
import AssinaturaFormModal from "@/app/components/admin/AssinaturaFormModal";
import { ADMIN_PAGE_SIZE, paramsPaginacao, parseListaPaginada } from "@/lib/admin/paginacao";
import type { UsuarioAdmin } from "@/types/admin";
import { PLANO_BADGE, formatarExpiracao, planoVitalicio, type CodigoPlano } from "@/types/plano";
import { Loader2, Search } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, Suspense } from "react";

const DIAS_EXPIRANDO = 30;

const FILTRO_PLANO_OPCOES = [
    { value: "ativas", label: "Assinaturas ativas" },
    { value: "opiniotop", label: "OpinioTop" },
    { value: "opiniopro", label: "OpinioPro" },
    { value: "expirando", label: "Expirando em breve" },
    { value: "expiradas", label: "Expiradas" },
    { value: "todas", label: "Todas (pagas)" },
] as const;

type FiltroPlano = (typeof FILTRO_PLANO_OPCOES)[number]["value"];

type AssinaturaStats = {
    top: number;
    pro: number;
    expirando: number;
    totalAtivas: number;
};

function isPlanoPago(codigo?: string) {
    return codigo === "opiniotop" || codigo === "opiniopro";
}

function diasAteExpiracao(iso?: string | null) {
    if (!iso) return null;
    const expira = new Date(iso);
    if (Number.isNaN(expira.getTime())) return null;
    const diff = expira.getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function VitaliciaBadge() {
    return (
        <span className="rounded-full bg-violet-100 px-2.5 py-0.5 font-gabarito-medium text-xs text-violet-800">
            Vitalícia
        </span>
    );
}

function PlanoBadge({ codigo }: { codigo: string }) {
    const badge = PLANO_BADGE[codigo as CodigoPlano];
    if (!badge) {
        return (
            <span className="rounded-full bg-cinza-200 px-2.5 py-0.5 font-gabarito-medium text-xs text-cinza-800">
                {codigo}
            </span>
        );
    }
    return (
        <span className={`rounded-full px-2.5 py-0.5 font-gabarito-medium text-xs ${badge.cor}`}>
            {badge.rotulo}
        </span>
    );
}

function StatCard({ rotulo, valor, destaque }: { rotulo: string; valor: number; destaque?: string }) {
    return (
        <div className="rounded-xl border border-cinza-200 bg-white px-4 py-3">
            <p className="font-gabarito-medium text-xs text-cinza-600">{rotulo}</p>
            <p className="mt-1 font-gabarito-bold text-2xl text-azul-900">{valor}</p>
            {destaque && (
                <p className="mt-0.5 font-gabarito-regular text-xs text-amber-700">{destaque}</p>
            )}
        </div>
    );
}

export default function AdminAssinaturasPage() {
    return (
        <Suspense
            fallback={
                <div className="flex justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-azul-600" />
                </div>
            }
        >
            <AdminAssinaturasConteudo />
        </Suspense>
    );
}

function AdminAssinaturasConteudo() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const nickInicial = searchParams.get("nick") ?? "";

    const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
    const [pagina, setPagina] = useState(1);
    const [total, setTotal] = useState(0);
    const [limite, setLimite] = useState(ADMIN_PAGE_SIZE);
    const [stats, setStats] = useState<AssinaturaStats>({
        top: 0,
        pro: 0,
        expirando: 0,
        totalAtivas: 0,
    });
    const [carregando, setCarregando] = useState(true);
    const [busca, setBusca] = useState(nickInicial);
    const [buscaDebounced, setBuscaDebounced] = useState(nickInicial);
    const [filtroPlano, setFiltroPlano] = useState<FiltroPlano>("ativas");
    const [sugestoesBusca, setSugestoesBusca] = useState<UsuarioAdmin[]>([]);
    const [modalAberto, setModalAberto] = useState(false);
    const [usuarioSelecionado, setUsuarioSelecionado] = useState<UsuarioAdmin | null>(null);
    const [nickResolvido, setNickResolvido] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setBuscaDebounced(busca);
            setPagina(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [busca]);

    const carregar = useCallback(async () => {
        setCarregando(true);
        try {
            const params = paramsPaginacao(pagina);
            params.set("assinatura", filtroPlano);
            params.set("stats", "assinaturas");
            if (buscaDebounced.trim()) params.set("q", buscaDebounced.trim());

            const res = await fetch(`/api/admin/usuarios?${params}`);
            if (res.ok) {
                const raw = await res.json();
                const data = parseListaPaginada<UsuarioAdmin>(raw);
                setUsuarios(data.itens);
                setTotal(data.total);
                setLimite(data.limite);
                if (raw?.stats) {
                    setStats({
                        top: raw.stats.top ?? 0,
                        pro: raw.stats.pro ?? 0,
                        expirando: raw.stats.expirando ?? 0,
                        totalAtivas: raw.stats.totalAtivas ?? 0,
                    });
                }
            }
        } finally {
            setCarregando(false);
        }
    }, [buscaDebounced, filtroPlano, pagina]);

    useEffect(() => {
        carregar();
    }, [carregar]);

    useEffect(() => {
        if (!nickInicial || nickResolvido) return;
        let cancelado = false;

        (async () => {
            const params = paramsPaginacao(1, 5);
            params.set("q", nickInicial);
            const res = await fetch(`/api/admin/usuarios?${params}`);
            if (!res.ok || cancelado) return;
            const data = parseListaPaginada<UsuarioAdmin>(await res.json());
            const usuario = data.itens.find(
                (u) => u.nick.toLowerCase() === nickInicial.toLowerCase(),
            );
            if (usuario && !cancelado) {
                setUsuarioSelecionado(usuario);
                setModalAberto(true);
            }
            if (!cancelado) setNickResolvido(true);
        })();

        return () => {
            cancelado = true;
        };
    }, [nickInicial, nickResolvido]);

    useEffect(() => {
        const termo = busca.trim();
        if (termo.length < 2) {
            setSugestoesBusca([]);
            return;
        }

        const timer = setTimeout(async () => {
            const params = paramsPaginacao(1, 5);
            params.set("q", termo);
            const res = await fetch(`/api/admin/usuarios?${params}`);
            if (!res.ok) return;
            const data = parseListaPaginada<UsuarioAdmin>(await res.json());
            setSugestoesBusca(data.itens);
        }, 250);

        return () => clearTimeout(timer);
    }, [busca]);

    function abrirGerenciar(usuario: UsuarioAdmin) {
        setUsuarioSelecionado(usuario);
        setModalAberto(true);
    }

    function abrirNova() {
        setUsuarioSelecionado(null);
        setModalAberto(true);
    }

    function abrirAtribuir(usuario: UsuarioAdmin) {
        setBusca(usuario.nick);
        abrirGerenciar(usuario);
    }

    function fecharModal() {
        setModalAberto(false);
        setUsuarioSelecionado(null);
        if (nickInicial) {
            router.replace("/admin/assinaturas");
        }
    }

    function alterarFiltro(valor: FiltroPlano) {
        setFiltroPlano(valor);
        setPagina(1);
    }

    return (
        <>
            <AdminPageHeader
                titulo="Assinaturas"
                acao={<AdminNovoButton label="Nova assinatura" onClick={abrirNova} />}
            />

            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard rotulo="OpinioTop ativos" valor={stats.top} />
                <StatCard rotulo="OpinioPro ativos" valor={stats.pro} />
                <StatCard
                    rotulo="Expirando em 30 dias"
                    valor={stats.expirando}
                    destaque={stats.expirando > 0 ? "Requer atenção" : undefined}
                />
                <StatCard rotulo="Total ativas" valor={stats.totalAtivas} />
            </div>

            <Box className="relative mb-4 p-4">
                <div className="flex flex-wrap gap-3">
                    <div className="relative min-w-[200px] flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cinza-400" />
                        <input
                            type="search"
                            value={busca}
                            onChange={(e) => setBusca(e.target.value)}
                            placeholder="Buscar por nick, nome ou e-mail..."
                            className="w-full rounded-xl border border-cinza-200 py-2.5 pl-10 pr-4 font-gabarito-regular text-sm text-azul-900 outline-none focus:border-azul-600"
                        />
                        {sugestoesBusca.length > 0 && busca.trim().length >= 2 && (
                            <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-xl border border-cinza-200 bg-white py-1 shadow-lg">
                                {sugestoesBusca.map((u) => (
                                    <button
                                        key={u.id}
                                        type="button"
                                        onClick={() => abrirAtribuir(u)}
                                        className="flex w-full items-center justify-between px-4 py-2 text-left font-gabarito-regular text-sm transition hover:bg-background"
                                    >
                                        <span>
                                            <span className="font-gabarito-medium text-azul-900">
                                                @{u.nick}
                                            </span>{" "}
                                            <span className="text-cinza-600">· {u.nome}</span>
                                        </span>
                                        <span className="text-xs text-cinza-500">
                                            {u.plano?.nome ?? "Gratuito"}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <select
                        value={filtroPlano}
                        onChange={(e) => alterarFiltro(e.target.value as FiltroPlano)}
                        className="rounded-xl border border-cinza-200 bg-white px-3 py-2.5 font-gabarito-regular text-sm text-azul-900 outline-none focus:border-azul-600"
                    >
                        {FILTRO_PLANO_OPCOES.map((op) => (
                            <option key={op.value} value={op.value}>
                                {op.label}
                            </option>
                        ))}
                    </select>
                </div>
                <p className="mt-3 font-gabarito-regular text-xs text-cinza-600">
                    Busque qualquer usuário para atribuir ou estender uma assinatura. A tabela lista
                    contas com plano pago registrado.
                </p>
            </Box>

            <Box className="overflow-hidden p-0">
                {carregando ? (
                    <div className="flex justify-center py-16">
                        <Loader2 className="h-8 w-8 animate-spin text-azul-600" />
                    </div>
                ) : (
                    <>
                        <AdminTable
                            data={usuarios}
                            keyExtractor={(u) => u.id}
                            emptyMessage="Nenhuma assinatura encontrada com os filtros atuais."
                            columns={[
                                {
                                    key: "usuario",
                                    header: "Usuário",
                                    render: (u) => (
                                        <div>
                                            <p className="font-gabarito-medium text-azul-900">{u.nome}</p>
                                            <p className="text-xs text-cinza-600">@{u.nick}</p>
                                        </div>
                                    ),
                                },
                                {
                                    key: "plano",
                                    header: "Plano",
                                    render: (u) => (
                                        <PlanoBadge codigo={u.plano?.codigo ?? "gratuito"} />
                                    ),
                                },
                                {
                                    key: "status",
                                    header: "Status",
                                    render: (u) => {
                                        const ativa = isPlanoPago(u.plano?.codigo);
                                        const vitalicia = planoVitalicio(u.plano);
                                        const dias = diasAteExpiracao(u.assinaturaExpiraEm);
                                        if (!ativa) {
                                            return (
                                                <span className="font-gabarito-medium text-sm text-red-500">
                                                    Expirada
                                                </span>
                                            );
                                        }
                                        if (vitalicia) {
                                            return <VitaliciaBadge />;
                                        }
                                        if (dias !== null && dias >= 0 && dias <= DIAS_EXPIRANDO) {
                                            return (
                                                <span className="font-gabarito-medium text-sm text-amber-700">
                                                    Expira em {dias} dia{dias !== 1 ? "s" : ""}
                                                </span>
                                            );
                                        }
                                        return (
                                            <span className="font-gabarito-medium text-sm text-emerald-600">
                                                Ativa
                                            </span>
                                        );
                                    },
                                },
                                {
                                    key: "expira",
                                    header: "Expira em",
                                    render: (u) =>
                                        planoVitalicio(u.plano) ? (
                                            <VitaliciaBadge />
                                        ) : u.assinaturaExpiraEm ? (
                                            formatarExpiracao(u.assinaturaExpiraEm)
                                        ) : (
                                            "Sem data"
                                        ),
                                },
                                {
                                    key: "email",
                                    header: "E-mail",
                                    render: (u) => (
                                        <span className="text-cinza-700">{u.email}</span>
                                    ),
                                },
                                {
                                    key: "acao",
                                    header: "Ação",
                                    render: (u) => (
                                        <button
                                            type="button"
                                            onClick={() => abrirGerenciar(u)}
                                            className="font-gabarito-medium text-sm text-azul-600 hover:underline"
                                        >
                                            Gerenciar
                                        </button>
                                    ),
                                },
                            ]}
                        />
                        <AdminPaginacao
                            pagina={pagina}
                            limite={limite}
                            total={total}
                            onChange={setPagina}
                            disabled={carregando}
                        />
                    </>
                )}
            </Box>

            <p className="mt-4 font-gabarito-regular text-sm text-cinza-600">
                Também é possível acessar pela{" "}
                <Link href="/admin/usuarios" className="text-azul-600 hover:underline">
                    lista de usuários
                </Link>
                .
            </p>

            <AssinaturaFormModal
                open={modalAberto}
                usuario={usuarioSelecionado}
                onClose={fecharModal}
                onSalvo={carregar}
            />
        </>
    );
}
