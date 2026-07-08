export type CodigoPlano = "gratuito" | "opiniotop" | "opiniopro";

export type PlanoStatus = {
    codigo: CodigoPlano | string;
    nome: string;
    assinaturaId: number;
    assinaturaExpiraEm?: string | null;
    vitalicia?: boolean;
    ativo: boolean;
    temPlanoTop: boolean;
    temPlanoPro: boolean;
};

export type PlanoCatalogo = {
    id: number;
    codigo: CodigoPlano | string;
    nome: string;
    nivel: number;
    analiseSentimento: boolean;
    modoZen: boolean;
    templatesEnriquecidos: boolean;
    precoMensal: number;
    precoAnual: number;
};

export type AtribuirPlanoPayload = {
    codigo: CodigoPlano;
    duracaoDias?: number;
    duracaoMeses?: number;
    expiraEm?: string;
    vitalicia?: boolean;
};

/** Recursos com gate de plano (outros módulos). */
export type RecursoPlano =
    | "modoZen"
    | "metaLeitura"
    | "gifAvatar"
    | "opinioWrapped"
    | "templatesResenha"
    | "estatisticasLeitura"
    | "edicaoResenhas"
    | "historicoLeitura";

export const PLANO_BADGE: Record<CodigoPlano, { rotulo: string; cor: string }> = {
    gratuito: { rotulo: "Gratuito", cor: "bg-cinza-200 text-cinza-800" },
    opiniotop: { rotulo: "OpinioTop", cor: "bg-azul-100 text-azul-800" },
    opiniopro: { rotulo: "OpinioPro", cor: "bg-amber-100 text-amber-900" },
};

export function formatarPreco(valor: number) {
    return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatarExpiracao(iso?: string | null) {
    if (!iso) return "Sem data de expiração";
    const data = new Date(iso);
    if (Number.isNaN(data.getTime())) return "—";
    return data.toLocaleDateString("pt-BR", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

export function planoVitalicio(plano?: PlanoStatus | null) {
    return !!plano && plano.codigo !== "gratuito" && !!plano.vitalicia;
}

export function rotuloValidadePlano(plano?: PlanoStatus | null) {
    if (!plano || plano.codigo === "gratuito") return null;
    if (plano.vitalicia) return "Vitalícia";
    if (plano.assinaturaExpiraEm) return `Válido até ${formatarExpiracao(plano.assinaturaExpiraEm)}`;
    return null;
}
