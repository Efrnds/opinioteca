"use client";

import type { MetaLeituraResposta, PeriodoMetaLeitura, TipoMetaLeitura } from "@/types/metaLeitura";
import { Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import PlanoUpgradeModal from "./PlanoUpgradeModal";

const selectClass =
    "rounded-full border-2 border-cinza-400 bg-white px-3 py-1.5 font-gabarito-regular text-sm outline-none focus:border-azul-600";

export default function MetaLeituraCard() {
    const { data: session } = useSession();
    const nick = session?.user?.nick;
    const [dados, setDados] = useState<MetaLeituraResposta | null>(null);
    const [carregando, setCarregando] = useState(true);
    const [salvando, setSalvando] = useState(false);
    const [ctaAberto, setCtaAberto] = useState(false);
    const [tipo, setTipo] = useState<TipoMetaLeitura>("paginas");
    const [periodo, setPeriodo] = useState<PeriodoMetaLeitura>("mensal");
    const [meta, setMeta] = useState("12");

    const carregar = useCallback(async () => {
        if (!nick) return;
        setCarregando(true);
        try {
            const res = await fetch(`/api/usuarios/${encodeURIComponent(nick)}/meta-leitura`);
            if (!res.ok) return;
            const json = (await res.json()) as MetaLeituraResposta;
            setDados(json);
            if (json.disponivel && json.configurada) {
                setTipo(json.meta.tipo);
                setPeriodo(json.meta.periodo);
                setMeta(String(json.meta.meta));
            }
        } finally {
            setCarregando(false);
        }
    }, [nick]);

    useEffect(() => {
        void carregar();
    }, [carregar]);

    async function salvar() {
        if (!nick) return;
        const valor = Number(meta);
        if (!Number.isFinite(valor) || valor <= 0) {
            toast.error("Informe uma meta válida.");
            return;
        }
        setSalvando(true);
        try {
            const res = await fetch(`/api/usuarios/${encodeURIComponent(nick)}/meta-leitura`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tipo, periodo, meta: valor }),
            });
            const data = (await res.json().catch(() => ({}))) as MetaLeituraResposta & { erro?: string };
            if (res.status === 403) {
                setCtaAberto(true);
                toast.error("Meta de leitura disponível apenas no OpinioPro.");
                return;
            }
            if (!res.ok) {
                toast.error(data.erro || "Não foi possível salvar a meta.");
                return;
            }
            setDados(data);
            toast.success("Meta de leitura salva.");
        } finally {
            setSalvando(false);
        }
    }

    if (carregando) {
        return (
            <div className="flex items-center gap-2 py-4 text-cinza-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="font-gabarito-regular text-sm">Carregando meta…</span>
            </div>
        );
    }

    if (dados && !dados.disponivel) {
        return (
            <>
                <div className="rounded-2xl border border-dashed border-violet-300 bg-violet-50/50 p-4">
                    <p className="font-gabarito-bold text-base text-azul-900">Meta de leitura</p>
                    <p className="mt-1 font-gabarito-regular text-sm text-cinza-700">
                        Defina metas mensais ou anuais e acompanhe seu progresso com o OpinioPro.
                    </p>
                    <button
                        type="button"
                        onClick={() => setCtaAberto(true)}
                        className="mt-3 rounded-full bg-gradient-to-r from-violet-600 to-azul-600 px-4 py-2 font-gabarito-bold text-sm text-white"
                    >
                        Conhecer OpinioPro
                    </button>
                </div>
                <PlanoUpgradeModal open={ctaAberto} onClose={() => setCtaAberto(false)} recurso="metaLeitura" />
            </>
        );
    }

    const progresso =
        dados?.disponivel && dados.configurada ? dados.meta : null;

    const rotuloTipo = progresso?.tipo === "livros" ? "livros" : "páginas";
    const rotuloPeriodo = progresso?.periodo === "anual" ? "este ano" : "este mês";

    return (
        <div className="rounded-2xl border border-azul-200 bg-azul-50/40 p-4">
            <p className="font-gabarito-bold text-base text-azul-900">Meta de leitura</p>
            <p className="mt-0.5 font-gabarito-regular text-sm text-cinza-700">
                Acompanhe seu objetivo de {rotuloPeriodo}.
            </p>

            {progresso ? (
                <div className="mt-4">
                    <div className="mb-1 flex justify-between font-gabarito-medium text-sm text-azul-900">
                        <span>
                            {progresso.progresso} / {progresso.meta} {rotuloTipo}
                        </span>
                        <span>{Math.round(progresso.percentual)}%</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-white">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-azul-500 to-violet-500 transition-all"
                            style={{ width: `${Math.min(100, progresso.percentual)}%` }}
                        />
                    </div>
                </div>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
                <select className={selectClass} value={tipo} onChange={(e) => setTipo(e.target.value as TipoMetaLeitura)}>
                    <option value="paginas">Páginas</option>
                    <option value="livros">Livros</option>
                </select>
                <select
                    className={selectClass}
                    value={periodo}
                    onChange={(e) => setPeriodo(e.target.value as PeriodoMetaLeitura)}
                >
                    <option value="mensal">Mensal</option>
                    <option value="anual">Anual</option>
                </select>
                <input
                    type="number"
                    min={1}
                    className={`${selectClass} w-24`}
                    value={meta}
                    onChange={(e) => setMeta(e.target.value)}
                />
                <button
                    type="button"
                    disabled={salvando}
                    onClick={() => void salvar()}
                    className="rounded-full bg-azul-600 px-4 py-2 font-gabarito-bold text-sm text-white hover:bg-azul-700 disabled:opacity-60"
                >
                    {salvando ? "Salvando…" : "Salvar meta"}
                </button>
            </div>
        </div>
    );
}
