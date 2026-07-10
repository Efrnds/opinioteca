import type { PlanoStatus } from "@/types/plano";

export const PLANO_GRATUITO = 1;
export const PLANO_OPINIOTOP = 2;
export const PLANO_OPINIOPRO = 3;

export function planoDeAssinaturaId(assinaturaId?: number, plano?: PlanoStatus): PlanoStatus {
    if (plano) return plano;
    const id = assinaturaId ?? PLANO_GRATUITO;
    const mapa: Record<number, PlanoStatus> = {
        [PLANO_GRATUITO]: {
            codigo: "gratuito",
            nome: "Gratuito",
            assinaturaId: id,
            ativo: true,
            temPlanoTop: false,
            temPlanoPro: false,
        },
        [PLANO_OPINIOTOP]: {
            codigo: "opiniotop",
            nome: "OpinioTop",
            assinaturaId: id,
            ativo: true,
            temPlanoTop: true,
            temPlanoPro: false,
        },
        [PLANO_OPINIOPRO]: {
            codigo: "opiniopro",
            nome: "OpinioPro",
            assinaturaId: id,
            ativo: true,
            temPlanoTop: true,
            temPlanoPro: true,
        },
    };
    return mapa[id] ?? mapa[PLANO_GRATUITO];
}

export function temPlanoTop(assinaturaId?: number, plano?: PlanoStatus) {
    if (plano) return plano.temPlanoTop;
    return (assinaturaId ?? PLANO_GRATUITO) >= PLANO_OPINIOTOP;
}

export function temPlanoPro(assinaturaId?: number, plano?: PlanoStatus) {
    if (plano) return plano.temPlanoPro;
    return (assinaturaId ?? PLANO_GRATUITO) >= PLANO_OPINIOPRO;
}

export function badgePlano(assinaturaId?: number, plano?: PlanoStatus): "pro" | "top" | null {
    const p = planoDeAssinaturaId(assinaturaId, plano);
    if (p.temPlanoPro) return "pro";
    if (p.temPlanoTop) return "top";
    return null;
}

export function rotuloPlano(assinaturaId?: number | null): string {
    const mapa: Record<number, string> = {
        [PLANO_GRATUITO]: "Gratuito",
        [PLANO_OPINIOTOP]: "OpinioTop",
        [PLANO_OPINIOPRO]: "OpinioPro",
    };
    if (assinaturaId == null) return "Gratuito";
    return mapa[assinaturaId] ?? `Plano #${assinaturaId}`;
}

export const PLANO_POR_ASSINATURA: Record<number, string> = {
    [PLANO_GRATUITO]: "Gratuito",
    [PLANO_OPINIOTOP]: "OpinioTop",
    [PLANO_OPINIOPRO]: "OpinioPro",
};

export const PRECOS = {
    opiniotop: { mensal: 9.99, anual: 89.99 },
    opiniopro: { mensal: 19.99, anual: 189.99 },
} as const;

export const URL_UPGRADE_PLANO = "/configuracoes?secao=plano";
