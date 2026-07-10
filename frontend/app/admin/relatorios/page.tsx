"use client";

import Box from "@/app/components/Box";
import AdminPageHeader from "@/app/components/admin/AdminPageHeader";
import { RELATORIO_TABS, type RelatorioTabId } from "@/lib/admin/relatorios";
import { Download, Loader2 } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

const inputClass =
    "w-full rounded-xl border border-cinza-200 bg-white px-3 py-2.5 font-gabarito-regular text-sm text-azul-900 outline-none focus:border-azul-600";
const labelClass = "mb-1.5 block font-gabarito-medium text-xs text-cinza-700";
const selectClass = inputClass;

type Filtros = {
    de: string;
    ate: string;
    status: string;
    plano: string;
    spoiler: string;
    filtroAssinatura: string;
    tipoDenuncia: string;
    tipoComentario: string;
    tipoLivro: string;
    tipoLeitor: "seguidores-seguindo" | "historico-leitura";
    q: string;
};

const filtrosIniciais: Filtros = {
    de: "",
    ate: "",
    status: "",
    plano: "",
    spoiler: "",
    filtroAssinatura: "todas",
    tipoDenuncia: "",
    tipoComentario: "livro",
    tipoLivro: "autor",
    tipoLeitor: "seguidores-seguindo",
    q: "",
};

function Campo({
    label,
    children,
}: {
    label: string;
    children: ReactNode;
}) {
    return (
        <div>
            <label className={labelClass}>{label}</label>
            {children}
        </div>
    );
}

async function baixarPdf(url: string, nomeFallback: string) {
    const res = await fetch(url);
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.erro ?? "Erro ao gerar PDF");
    }
    const blob = await res.blob();
    const disposition = res.headers.get("Content-Disposition") ?? "";
    const match = /filename="?([^"]+)"?/i.exec(disposition);
    const nome = match?.[1] ?? nomeFallback;
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
}

export default function AdminRelatoriosPage() {
    const [tab, setTab] = useState<RelatorioTabId>("usuarios");
    const [filtros, setFiltros] = useState<Filtros>(filtrosIniciais);
    const [gerando, setGerando] = useState(false);

    const config = useMemo(() => RELATORIO_TABS.find((t) => t.id === tab)!, [tab]);

    function atualizar<K extends keyof Filtros>(chave: K, valor: Filtros[K]) {
        setFiltros((prev) => ({ ...prev, [chave]: valor }));
    }

    async function gerarPdf() {
        if (config.requerConsulta && !filtros.q.trim()) {
            toast.error("Informe a consulta para gerar este relatório.");
            return;
        }

        const params = new URLSearchParams();
        const add = (k: string, v: string) => {
            if (v.trim()) params.set(k, v.trim());
        };

        let endpoint = config.endpoint;

        switch (tab) {
            case "usuarios":
                add("de", filtros.de);
                add("ate", filtros.ate);
                add("status", filtros.status);
                add("plano", filtros.plano);
                break;
            case "avaliacoes":
                add("de", filtros.de);
                add("ate", filtros.ate);
                add("spoiler", filtros.spoiler);
                break;
            case "assinaturas":
                add("plano", filtros.plano);
                add("filtro", filtros.filtroAssinatura);
                break;
            case "denuncias":
                add("de", filtros.de);
                add("ate", filtros.ate);
                add("status", filtros.status);
                add("tipo", filtros.tipoDenuncia);
                break;
            case "comentarios":
                add("tipo", filtros.tipoComentario);
                add("q", filtros.q);
                break;
            case "livros":
                add("tipo", filtros.tipoLivro);
                add("q", filtros.q);
                break;
            case "leitor":
                endpoint =
                    filtros.tipoLeitor === "historico-leitura"
                        ? "/api/admin/relatorios/pdf/historico-leitura"
                        : "/api/admin/relatorios/pdf/seguidores-seguindo";
                add("q", filtros.q);
                break;
        }

        const qs = params.toString();
        const url = qs ? `${endpoint}?${qs}` : endpoint;

        setGerando(true);
        try {
            await baixarPdf(url, `relatorio-${tab}.pdf`);
            toast.success("PDF gerado com sucesso.");
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Erro ao gerar PDF");
        } finally {
            setGerando(false);
        }
    }

    return (
        <>
            <AdminPageHeader titulo="Relatórios" />

            <div className="mb-6 flex flex-wrap gap-2 border-b border-cinza-200 pb-3">
                {RELATORIO_TABS.map((t) => {
                    const ativo = t.id === tab;
                    return (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => setTab(t.id)}
                            className={`rounded-full px-4 py-2 font-gabarito-medium text-sm transition ${
                                ativo
                                    ? "bg-azul-600 text-white"
                                    : "bg-cinza-100 text-azul-900 hover:bg-cinza-200"
                            }`}
                        >
                            {t.label}
                        </button>
                    );
                })}
            </div>

            <Box className="max-w-3xl p-6">
                <h2 className="font-gabarito-bold text-xl text-azul-900">{config.titulo}</h2>
                <p className="mt-2 font-gabarito-regular text-sm text-cinza-700">{config.descricao}</p>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    {(tab === "usuarios" || tab === "avaliacoes" || tab === "denuncias") && (
                        <>
                            <Campo label="Data inicial">
                                <input
                                    type="date"
                                    value={filtros.de}
                                    onChange={(e) => atualizar("de", e.target.value)}
                                    className={inputClass}
                                />
                            </Campo>
                            <Campo label="Data final">
                                <input
                                    type="date"
                                    value={filtros.ate}
                                    onChange={(e) => atualizar("ate", e.target.value)}
                                    className={inputClass}
                                />
                            </Campo>
                        </>
                    )}

                    {tab === "usuarios" && (
                        <>
                            <Campo label="Status">
                                <select
                                    value={filtros.status}
                                    onChange={(e) => atualizar("status", e.target.value)}
                                    className={selectClass}
                                >
                                    <option value="">Todos</option>
                                    <option value="ativo">Ativo</option>
                                    <option value="inativo">Inativo</option>
                                </select>
                            </Campo>
                            <Campo label="Plano">
                                <select
                                    value={filtros.plano}
                                    onChange={(e) => atualizar("plano", e.target.value)}
                                    className={selectClass}
                                >
                                    <option value="">Todos</option>
                                    <option value="gratuito">Gratuito</option>
                                    <option value="opiniotop">OpinioTop</option>
                                    <option value="opiniopro">OpinioPro</option>
                                </select>
                            </Campo>
                        </>
                    )}

                    {tab === "avaliacoes" && (
                        <Campo label="Spoiler">
                            <select
                                value={filtros.spoiler}
                                onChange={(e) => atualizar("spoiler", e.target.value)}
                                className={selectClass}
                            >
                                <option value="">Todos</option>
                                <option value="sim">Apenas com spoiler</option>
                                <option value="nao">Apenas sem spoiler</option>
                            </select>
                        </Campo>
                    )}

                    {tab === "assinaturas" && (
                        <>
                            <Campo label="Plano">
                                <select
                                    value={filtros.plano}
                                    onChange={(e) => atualizar("plano", e.target.value)}
                                    className={selectClass}
                                >
                                    <option value="">Todos (pagos)</option>
                                    <option value="opiniotop">OpinioTop</option>
                                    <option value="opiniopro">OpinioPro</option>
                                </select>
                            </Campo>
                            <Campo label="Situação">
                                <select
                                    value={filtros.filtroAssinatura}
                                    onChange={(e) => atualizar("filtroAssinatura", e.target.value)}
                                    className={selectClass}
                                >
                                    <option value="todas">Todas</option>
                                    <option value="ativas">Ativas</option>
                                    <option value="expirando">Expirando em 30 dias</option>
                                    <option value="expiradas">Expiradas</option>
                                </select>
                            </Campo>
                        </>
                    )}

                    {tab === "denuncias" && (
                        <>
                            <Campo label="Status">
                                <select
                                    value={filtros.status}
                                    onChange={(e) => atualizar("status", e.target.value)}
                                    className={selectClass}
                                >
                                    <option value="">Todos</option>
                                    <option value="pendente">Pendente</option>
                                    <option value="em_analise">Em análise</option>
                                    <option value="resolvida">Resolvida</option>
                                    <option value="rejeitada">Rejeitada</option>
                                </select>
                            </Campo>
                            <Campo label="Tipo de entidade">
                                <select
                                    value={filtros.tipoDenuncia}
                                    onChange={(e) => atualizar("tipoDenuncia", e.target.value)}
                                    className={selectClass}
                                >
                                    <option value="">Todos</option>
                                    <option value="avaliacao">Avaliação</option>
                                    <option value="comentario">Comentário</option>
                                    <option value="usuario">Usuário</option>
                                    <option value="mensagem">Mensagem</option>
                                </select>
                            </Campo>
                        </>
                    )}

                    {tab === "comentarios" && (
                        <>
                            <Campo label="Filtrar por">
                                <select
                                    value={filtros.tipoComentario}
                                    onChange={(e) => atualizar("tipoComentario", e.target.value)}
                                    className={selectClass}
                                >
                                    <option value="livro">Livro</option>
                                    <option value="usuario">Usuário</option>
                                    <option value="categoria">Categoria</option>
                                </select>
                            </Campo>
                            <Campo label="Consulta">
                                <input
                                    type="text"
                                    value={filtros.q}
                                    onChange={(e) => atualizar("q", e.target.value)}
                                    placeholder="Título, nick, e-mail, ID..."
                                    className={inputClass}
                                />
                            </Campo>
                        </>
                    )}

                    {tab === "livros" && (
                        <>
                            <Campo label="Filtrar por">
                                <select
                                    value={filtros.tipoLivro}
                                    onChange={(e) => atualizar("tipoLivro", e.target.value)}
                                    className={selectClass}
                                >
                                    <option value="autor">Autor</option>
                                    <option value="editora">Editora</option>
                                    <option value="categoria">Categoria</option>
                                </select>
                            </Campo>
                            <Campo label="Consulta">
                                <input
                                    type="text"
                                    value={filtros.q}
                                    onChange={(e) => atualizar("q", e.target.value)}
                                    placeholder="Nome ou ID..."
                                    className={inputClass}
                                />
                            </Campo>
                        </>
                    )}

                    {tab === "leitor" && (
                        <>
                            <Campo label="Tipo de relatório">
                                <select
                                    value={filtros.tipoLeitor}
                                    onChange={(e) =>
                                        atualizar(
                                            "tipoLeitor",
                                            e.target.value as Filtros["tipoLeitor"],
                                        )
                                    }
                                    className={selectClass}
                                >
                                    <option value="seguidores-seguindo">Seguidores e seguindo</option>
                                    <option value="historico-leitura">Histórico de leitura</option>
                                </select>
                            </Campo>
                            <Campo label="Leitor">
                                <input
                                    type="text"
                                    value={filtros.q}
                                    onChange={(e) => atualizar("q", e.target.value)}
                                    placeholder="Nick, e-mail ou ID"
                                    className={inputClass}
                                />
                            </Campo>
                        </>
                    )}
                </div>

                <button
                    type="button"
                    onClick={gerarPdf}
                    disabled={gerando}
                    className="mt-6 inline-flex items-center gap-2 rounded-full bg-azul-600 px-6 py-3 font-gabarito-bold text-sm text-white transition hover:bg-azul-500 disabled:opacity-60"
                >
                    {gerando ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Download className="h-4 w-4" />
                    )}
                    Gerar PDF
                </button>
            </Box>
        </>
    );
}
