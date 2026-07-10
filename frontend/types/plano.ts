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
    | "temasCustom"
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

/** Dias restantes para exibir aviso de assinatura perto de vencer (padrão: 7). */
export const DIAS_AVISO_ASSINATURA_EXPIRANDO = 7;

export function formatarExpiracao(iso?: string | null) {
    if (!iso) return "Sem data de expiração";
    const data = new Date(iso);
    if (Number.isNaN(data.getTime())) return "Data inválida";
    return data.toLocaleDateString("pt-BR", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

/** Formata ISO como dd/mm/aaaa. */
export function formatarDataCurta(iso?: string | null) {
    if (!iso) return "";
    const data = new Date(iso);
    if (Number.isNaN(data.getTime())) return "";
    return data.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
}

/** Dias até a expiração (ceil). Null se data ausente/inválida. */
export function diasAteExpiracao(iso?: string | null): number | null {
    if (!iso) return null;
    const expira = new Date(iso);
    if (Number.isNaN(expira.getTime())) return null;
    return Math.ceil((expira.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export type InfoAssinaturaExpirando = {
    dias: number;
    nomePlano: string;
    dataFormatada: string;
    mensagem: string;
};

/**
 * Retorna info de aviso se o plano pago ativo vence em até DIAS_AVISO_ASSINATURA_EXPIRANDO dias.
 * Não avisa: gratuito, vitalícia (null), já expirado (PlanoAtivo / ativo=false).
 */
export function infoAssinaturaExpirando(plano?: PlanoStatus | null): InfoAssinaturaExpirando | null {
    if (!plano) return null;
    if (plano.codigo === "gratuito") return null;
    if (plano.vitalicia || !plano.assinaturaExpiraEm) return null;
    if (!plano.ativo) return null;

    const dias = diasAteExpiracao(plano.assinaturaExpiraEm);
    if (dias == null || dias <= 0 || dias > DIAS_AVISO_ASSINATURA_EXPIRANDO) return null;

    const dataFormatada = formatarDataCurta(plano.assinaturaExpiraEm);
    const unidade = dias === 1 ? "dia" : "dias";
    const mensagem = `Sua assinatura ${plano.nome} vence em ${dias} ${unidade} (${dataFormatada}).`;

    return {
        dias,
        nomePlano: plano.nome,
        dataFormatada,
        mensagem,
    };
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
