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

/** Modal share slide gradient — unchanged (Spotify-style) */
export const WRAPPED_SHARE_GRADIENT_TAILWIND = "from-[#14061c] via-[#7e22ce] to-[#f97316]";

/** Share card capture gradient — Opinoteca brand */
export const WRAPPED_SHARE_GRADIENT_CSS =
    `linear-gradient(155deg, ${OPINOTECA_OFF_WHITE} 0%, #F4F7FC 38%, #E2EBFF 72%, ${OPINOTECA_AZUL_200}33 100%)`;

export const WRAPPED_SHARE_BG_COLOR = OPINOTECA_OFF_WHITE;

export function formatarPeriodo(inicio?: string, fim?: string) {
    if (!inicio || !fim) return "últimos 12 meses";
    const fmt = (s: string) => {
        const [y, m] = s.split("-").map(Number);
        return new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "short", year: "numeric" }).toUpperCase();
    };
    return `${fmt(inicio)} – ${fmt(fim)}`;
}

export function formatarPeriodoShare(inicio?: string, fim?: string) {
    if (!inicio || !fim) return "12 MESES";
    const fmt = (s: string) => {
        const [y, m] = s.split("-").map(Number);
        return new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "short", year: "numeric" }).toUpperCase();
    };
    return `${fmt(inicio)} – ${fmt(fim)}`;
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
    if (!ym) return "—";
    const [ano, mes] = ym.split("-");
    const data = new Date(Number(ano), Number(mes) - 1, 1);
    return data.toLocaleDateString("pt-BR", { month: "long" });
}

/** Stat chip — white card, no backdrop-filter (html-to-image safe) */
export function chipStyle(): CSSProperties {
    return {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 32,
        border: `1px solid ${OPINOTECA_AZUL_200}`,
        background: OPINOTECA_WHITE,
        padding: "28px 24px",
        minWidth: 0,
        boxShadow: "0 8px 24px rgba(27, 36, 50, 0.06)",
    };
}

/** Hero ring — no backdrop-filter */
export function heroRingStyle(size: number): CSSProperties {
    return {
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: "50%",
        border: `2px solid ${OPINOTECA_AZUL_200}`,
        background: OPINOTECA_WHITE,
        boxSizing: "border-box",
        boxShadow: "0 12px 32px rgba(0, 72, 255, 0.10)",
    };
}

export function heroRingInnerStyle(size: number): CSSProperties {
    return {
        position: "absolute",
        inset: size * 0.12,
        borderRadius: "50%",
        border: `1px dashed ${OPINOTECA_AZUL_200}`,
    };
}

/** Accent card (best-month / highlight blocks) */
export function accentCardStyle(): CSSProperties {
    return {
        borderRadius: 64,
        border: `1px solid ${OPINOTECA_AZUL_200}`,
        background: OPINOTECA_WHITE,
        padding: "40px 48px",
        textAlign: "center",
        boxShadow: "0 10px 28px rgba(27, 36, 50, 0.07)",
    };
}

/** Sparkles badge */
export function sparklesBadgeStyle(): CSSProperties {
    return {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 192,
        height: 192,
        borderRadius: 64,
        border: `1px solid ${OPINOTECA_AZUL_200}`,
        background: `linear-gradient(145deg, ${OPINOTECA_WHITE} 0%, #EEF3FF 100%)`,
        boxShadow: "0 16px 40px rgba(0, 72, 255, 0.14)",
    };
}
