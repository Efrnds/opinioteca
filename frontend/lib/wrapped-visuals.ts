import type { CSSProperties } from "react";

/** Opinoteca system palette (from globals.css) */
export const OPINOTECA_AZUL_900 = "#1B2432";
export const OPINOTECA_AZUL_800 = "#000E33";
export const OPINOTECA_AZUL_700 = "#001d66";
export const OPINOTECA_AZUL_600 = "#0048FF";
export const OPINOTECA_AZUL_500 = "#3C73FF";
export const OPINOTECA_AZUL_200 = "#99B6FF";
export const OPINOTECA_OFF_WHITE = "#E8EAED";
export const OPINOTECA_WHITE = "#FFFFFF";
export const OPINOTECA_CINZA_700 = "#808080";
export const OPINOTECA_FOREGROUND = "#171717";

/** Modal share slide gradient: unchanged (Spotify-style) */
export const WRAPPED_SHARE_GRADIENT_TAILWIND = "from-[#14061c] via-[#7e22ce] to-[#f97316]";

export type WrappedShareTemaId = "brand" | "navy" | "sunset" | "violet" | "teal" | "mono";

export type WrappedShareTema = {
    id: WrappedShareTemaId;
    label: string;
    /** Primary swatch color for the picker */
    swatch: string;
    /** Optional secondary for dual-tone swatch */
    swatchSecondary?: string;
    bgColor: string;
    gradientCss: string;
    text: string;
    textMuted: string;
    accent: string;
    accentSoft: string;
    border: string;
    surface: string;
    surfaceAlt: string;
    ghost: string;
    orb1: string;
    orb2: string;
    orb3: string;
    orb4: string;
    shadow: string;
    accentShadow: string;
    ctaText: string;
    previewText: string;
    previewMuted: string;
    previewChip: string;
};

export const WRAPPED_SHARE_TEMAS: Record<WrappedShareTemaId, WrappedShareTema> = {
    brand: {
        id: "brand",
        label: "Azul",
        swatch: OPINOTECA_AZUL_600,
        swatchSecondary: OPINOTECA_AZUL_200,
        bgColor: OPINOTECA_OFF_WHITE,
        gradientCss: `linear-gradient(155deg, ${OPINOTECA_OFF_WHITE} 0%, #F4F7FC 38%, #E2EBFF 72%, ${OPINOTECA_AZUL_200}33 100%)`,
        text: OPINOTECA_AZUL_900,
        textMuted: OPINOTECA_CINZA_700,
        accent: OPINOTECA_AZUL_600,
        accentSoft: OPINOTECA_AZUL_500,
        border: OPINOTECA_AZUL_200,
        surface: OPINOTECA_WHITE,
        surfaceAlt: "#EEF3FF",
        ghost: "rgba(0, 72, 255, 0.06)",
        orb1: "rgba(0, 72, 255, 0.12)",
        orb2: "rgba(153, 182, 255, 0.35)",
        orb3: "rgba(60, 115, 255, 0.14)",
        orb4: "rgba(0, 72, 255, 0.08)",
        shadow: "rgba(27, 36, 50, 0.06)",
        accentShadow: "rgba(0, 72, 255, 0.14)",
        ctaText: OPINOTECA_WHITE,
        previewText: OPINOTECA_AZUL_900,
        previewMuted: OPINOTECA_CINZA_700,
        previewChip: "rgba(0, 72, 255, 0.10)",
    },
    navy: {
        id: "navy",
        label: "Noite",
        swatch: "#0B1220",
        swatchSecondary: "#3C73FF",
        bgColor: "#070B14",
        gradientCss: "linear-gradient(155deg, #070B14 0%, #0B1220 40%, #121A2E 72%, #1A2744 100%)",
        text: "#F2F5FA",
        textMuted: "#8B95A8",
        accent: "#5B8CFF",
        accentSoft: "#99B6FF",
        border: "rgba(153, 182, 255, 0.28)",
        surface: "#121A2E",
        surfaceAlt: "#1A2744",
        ghost: "rgba(91, 140, 255, 0.08)",
        orb1: "rgba(60, 115, 255, 0.18)",
        orb2: "rgba(0, 72, 255, 0.22)",
        orb3: "rgba(153, 182, 255, 0.12)",
        orb4: "rgba(27, 36, 50, 0.45)",
        shadow: "rgba(0, 0, 0, 0.35)",
        accentShadow: "rgba(60, 115, 255, 0.28)",
        ctaText: "#070B14",
        previewText: "#F2F5FA",
        previewMuted: "#8B95A8",
        previewChip: "rgba(91, 140, 255, 0.18)",
    },
    sunset: {
        id: "sunset",
        label: "Pôr do sol",
        swatch: "#E85D04",
        swatchSecondary: "#FFBA08",
        bgColor: "#FFF4EB",
        gradientCss: "linear-gradient(155deg, #FFF4EB 0%, #FFE0C2 38%, #FFC9A0 68%, #FFB088 100%)",
        text: "#3D1F0F",
        textMuted: "#9A6B4F",
        accent: "#E85D04",
        accentSoft: "#F48C06",
        border: "#F4A261",
        surface: "#FFFFFF",
        surfaceAlt: "#FFF0E0",
        ghost: "rgba(232, 93, 4, 0.07)",
        orb1: "rgba(232, 93, 4, 0.14)",
        orb2: "rgba(255, 186, 8, 0.28)",
        orb3: "rgba(244, 140, 6, 0.16)",
        orb4: "rgba(220, 80, 40, 0.10)",
        shadow: "rgba(61, 31, 15, 0.08)",
        accentShadow: "rgba(232, 93, 4, 0.18)",
        ctaText: "#FFFFFF",
        previewText: "#3D1F0F",
        previewMuted: "#9A6B4F",
        previewChip: "rgba(232, 93, 4, 0.12)",
    },
    violet: {
        id: "violet",
        label: "Violeta",
        swatch: "#7C3AED",
        swatchSecondary: "#C084FC",
        bgColor: "#F5F0FF",
        gradientCss: "linear-gradient(155deg, #F5F0FF 0%, #EDE4FF 38%, #DDD0FF 68%, #C4B5FD55 100%)",
        text: "#2E1065",
        textMuted: "#7C6A99",
        accent: "#7C3AED",
        accentSoft: "#A78BFA",
        border: "#C4B5FD",
        surface: "#FFFFFF",
        surfaceAlt: "#F3E8FF",
        ghost: "rgba(124, 58, 237, 0.07)",
        orb1: "rgba(124, 58, 237, 0.14)",
        orb2: "rgba(192, 132, 252, 0.30)",
        orb3: "rgba(167, 139, 250, 0.16)",
        orb4: "rgba(109, 40, 217, 0.08)",
        shadow: "rgba(46, 16, 101, 0.07)",
        accentShadow: "rgba(124, 58, 237, 0.18)",
        ctaText: "#FFFFFF",
        previewText: "#2E1065",
        previewMuted: "#7C6A99",
        previewChip: "rgba(124, 58, 237, 0.12)",
    },
    teal: {
        id: "teal",
        label: "Teal",
        swatch: "#0D9488",
        swatchSecondary: "#5EEAD4",
        bgColor: "#ECFDF8",
        gradientCss: "linear-gradient(155deg, #ECFDF8 0%, #D1FAF0 38%, #A7F3E0 68%, #5EEAD455 100%)",
        text: "#134E4A",
        textMuted: "#5F8A84",
        accent: "#0D9488",
        accentSoft: "#14B8A6",
        border: "#99F6E4",
        surface: "#FFFFFF",
        surfaceAlt: "#E6FFFA",
        ghost: "rgba(13, 148, 136, 0.07)",
        orb1: "rgba(13, 148, 136, 0.14)",
        orb2: "rgba(94, 234, 212, 0.32)",
        orb3: "rgba(20, 184, 166, 0.16)",
        orb4: "rgba(15, 118, 110, 0.08)",
        shadow: "rgba(19, 78, 74, 0.07)",
        accentShadow: "rgba(13, 148, 136, 0.18)",
        ctaText: "#FFFFFF",
        previewText: "#134E4A",
        previewMuted: "#5F8A84",
        previewChip: "rgba(13, 148, 136, 0.12)",
    },
    mono: {
        id: "mono",
        label: "P&B",
        swatch: "#111111",
        swatchSecondary: "#FFFFFF",
        bgColor: "#FAFAFA",
        gradientCss: "linear-gradient(155deg, #FAFAFA 0%, #F0F0F0 45%, #E5E5E5 100%)",
        text: "#111111",
        textMuted: "#737373",
        accent: "#111111",
        accentSoft: "#404040",
        border: "#D4D4D4",
        surface: "#FFFFFF",
        surfaceAlt: "#F5F5F5",
        ghost: "rgba(17, 17, 17, 0.05)",
        orb1: "rgba(17, 17, 17, 0.06)",
        orb2: "rgba(17, 17, 17, 0.04)",
        orb3: "rgba(17, 17, 17, 0.08)",
        orb4: "rgba(17, 17, 17, 0.03)",
        shadow: "rgba(0, 0, 0, 0.08)",
        accentShadow: "rgba(0, 0, 0, 0.16)",
        ctaText: "#FFFFFF",
        previewText: "#111111",
        previewMuted: "#737373",
        previewChip: "rgba(17, 17, 17, 0.08)",
    },
};

export const WRAPPED_SHARE_TEMAS_LIST = Object.values(WRAPPED_SHARE_TEMAS);

export const WRAPPED_SHARE_TEMA_PADRAO: WrappedShareTemaId = "brand";

export function getWrappedShareTema(id?: WrappedShareTemaId | null): WrappedShareTema {
    return WRAPPED_SHARE_TEMAS[id ?? WRAPPED_SHARE_TEMA_PADRAO] ?? WRAPPED_SHARE_TEMAS.brand;
}

/** @deprecated Prefer theme.gradientCss; kept for callers expecting brand default */
export const WRAPPED_SHARE_GRADIENT_CSS = WRAPPED_SHARE_TEMAS.brand.gradientCss;

/** @deprecated Prefer theme.bgColor */
export const WRAPPED_SHARE_BG_COLOR = WRAPPED_SHARE_TEMAS.brand.bgColor;

export function formatarPeriodo(inicio?: string, fim?: string) {
    if (!inicio || !fim) return "últimos 12 meses";
    const fmt = (s: string) => {
        const [y, m] = s.split("-").map(Number);
        return new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "short", year: "numeric" }).toUpperCase();
    };
    return `${fmt(inicio)} a ${fmt(fim)}`;
}

export function formatarPeriodoShare(inicio?: string, fim?: string) {
    if (!inicio || !fim) return "12 MESES";
    const fmt = (s: string) => {
        const [y, m] = s.split("-").map(Number);
        return new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "short", year: "numeric" }).toUpperCase();
    };
    return `${fmt(inicio)} a ${fmt(fim)}`;
}

export function anoDoPeriodo(fim?: string) {
    if (!fim) return new Date().getFullYear().toString();
    return fim.split("-")[0] ?? new Date().getFullYear().toString();
}

export function formatarMes(ym?: string) {
    if (!ym) return "seu melhor mês";
    const [ano, mes] = ym.split("-");
    const data = new Date(Number(ano), Number(mes) - 1, 1);
    return data.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

export function formatarMesCurto(ym?: string) {
    if (!ym) return "-";
    const [ano, mes] = ym.split("-");
    const data = new Date(Number(ano), Number(mes) - 1, 1);
    return data.toLocaleDateString("pt-BR", { month: "long" });
}

/** Stat chip: white card, no backdrop-filter (html-to-image safe) */
export function chipStyle(tema: WrappedShareTema = WRAPPED_SHARE_TEMAS.brand): CSSProperties {
    return {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 32,
        border: `1px solid ${tema.border}`,
        background: tema.surface,
        padding: "28px 24px",
        minWidth: 0,
        boxShadow: `0 8px 24px ${tema.shadow}`,
    };
}

/** Hero ring: no backdrop-filter */
export function heroRingStyle(size: number, tema: WrappedShareTema = WRAPPED_SHARE_TEMAS.brand): CSSProperties {
    return {
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: "50%",
        border: `2px solid ${tema.border}`,
        background: tema.surface,
        boxSizing: "border-box",
        boxShadow: `0 12px 32px ${tema.accentShadow}`,
    };
}

export function heroRingInnerStyle(size: number, tema: WrappedShareTema = WRAPPED_SHARE_TEMAS.brand): CSSProperties {
    return {
        position: "absolute",
        inset: size * 0.12,
        borderRadius: "50%",
        border: `1px dashed ${tema.border}`,
    };
}

/** Accent card (best-month / highlight blocks) */
export function accentCardStyle(tema: WrappedShareTema = WRAPPED_SHARE_TEMAS.brand): CSSProperties {
    return {
        borderRadius: 64,
        border: `1px solid ${tema.border}`,
        background: tema.surface,
        padding: "40px 48px",
        textAlign: "center",
        boxShadow: `0 10px 28px ${tema.shadow}`,
    };
}

/** Sparkles badge */
export function sparklesBadgeStyle(tema: WrappedShareTema = WRAPPED_SHARE_TEMAS.brand): CSSProperties {
    return {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 192,
        height: 192,
        borderRadius: 64,
        border: `1px solid ${tema.border}`,
        background: `linear-gradient(145deg, ${tema.surface} 0%, ${tema.surfaceAlt} 100%)`,
        boxShadow: `0 16px 40px ${tema.accentShadow}`,
    };
}
