import type { CorDestaquePreset, DaltonismoTipo, TemaAparencia } from "@/types/configuracao";

export const TEMA_STORAGE_KEY = "opinioteca-tema";

export type PreferenciaTema = {
    tema: TemaAparencia;
    daltonismoTipo: DaltonismoTipo;
    corDestaque: string;
    corFundoTexto: string | null;
    corSuperficie: string | null;
    corTexto: string | null;
    corHover: string | null;
};

export type AccentSwatch = {
    id: CorDestaquePreset;
    label: string;
    hex: string;
};

/** Presets Twitter-like: hexes com bom contraste em claro e escuro. */
export const CORES_DESTAQUE: AccentSwatch[] = [
    { id: "azul", label: "Azul", hex: "#0048FF" },
    { id: "verde", label: "Verde", hex: "#059669" },
    { id: "rosa", label: "Rosa", hex: "#DB2777" },
    { id: "roxo", label: "Roxo", hex: "#7C3AED" },
    { id: "laranja", label: "Laranja", hex: "#EA580C" },
    { id: "amarelo", label: "Amarelo", hex: "#CA8A04" },
];

export const OPCOES_TEMA: { id: TemaAparencia; label: string; descricao: string; pro?: boolean }[] = [
    { id: "claro", label: "Claro", descricao: "Visual padrão da Opinoteca" },
    { id: "escuro", label: "Escuro", descricao: "Fundos escuros e texto claro" },
    { id: "leitor", label: "Modo leitor", descricao: "Papel creme, contraste suave para leitura longa" },
    {
        id: "daltonismo",
        label: "Daltonismo",
        descricao: "Paletas adaptadas para tipos de daltonismo",
    },
    {
        id: "custom",
        label: "Personalizado",
        descricao: "Suas cores de fundo, superfície e hover",
        pro: true,
    },
];

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;
const FUNDO_CUSTOM_PADRAO = "#E8EAED";
const SUPERFICIE_CUSTOM_PADRAO = "#FFFFFF";
/** Texto escuro (sobre fundos claros). */
const TEXTO_CLARO_PADRAO = "#1B2432";
/** Texto claro (sobre fundos escuros). */
const TEXTO_ESCURO_PADRAO = "#F5F5F5";
/** Contraste mínimo alvo (WCAG AA texto normal ≈ 4.5:1). */
const CONTRASTE_SECUNDARIO_MIN = 4.5;
/** Texto sobre accent claro. */
const TEXTO_SOBRE_DESTAQUE_CLARO = TEXTO_CLARO_PADRAO;
/** Texto sobre accent escuro. */
const TEXTO_SOBRE_DESTAQUE_ESCURO = "#FFFFFF";

const FUNDO_POR_TEMA: Record<TemaAparencia, string> = {
    claro: "#E8EAED",
    escuro: "#0F1419",
    leitor: "#EDE6D9",
    daltonismo: "#E8EAED",
    custom: FUNDO_CUSTOM_PADRAO,
};

const PALETAS_DALTONISMO: Record<DaltonismoTipo, Record<"50" | "100" | "200" | "400" | "500" | "600" | "700", string>> = {
    protanopia: {
        "50": "#EEF4FF",
        "100": "#DCE8FF",
        "200": "#B7D0FF",
        "400": "#3E75D5",
        "500": "#2D5CB5",
        "600": "#1D4D9E",
        "700": "#173D7D",
    },
    deuteranopia: {
        "50": "#EEF8F6",
        "100": "#D5EEE9",
        "200": "#A8DDD1",
        "400": "#1D8F8C",
        "500": "#117A77",
        "600": "#0E6663",
        "700": "#0A514E",
    },
    tritanopia: {
        "50": "#FFF6EE",
        "100": "#FFE6CF",
        "200": "#FFD0A3",
        "400": "#D2871F",
        "500": "#B26F14",
        "600": "#955C10",
        "700": "#78490C",
    },
    acromatopsia: {
        "50": "#F5F5F5",
        "100": "#E8E8E8",
        "200": "#D2D2D2",
        "400": "#8A8A8A",
        "500": "#767676",
        "600": "#5F5F5F",
        "700": "#4A4A4A",
    },
};

export function ehHexCor(v: string): boolean {
    return HEX_RE.test(v.trim());
}

/** Digitos hex (sem #) para o campo de texto; remove # e caracteres invalidos. */
export function digitosHexDigitados(raw: string): string {
    return raw
        .replace(/#/g, "")
        .replace(/[^0-9A-Fa-f]/g, "")
        .slice(0, 6)
        .toLowerCase();
}

/** Valor exibido no input (sem #) a partir de um hex armazenado. */
export function hexParaCampo(hex: string): string {
    return digitosHexDigitados(hex);
}

/** Monta #rrggbb lowercase a partir dos digitos; null se incompleto. */
export function hexDeDigitos(digits: string): string | null {
    const d = digitosHexDigitados(digits);
    if (d.length !== 6) return null;
    return `#${d}`;
}

export function ehPresetCor(v: string): v is CorDestaquePreset {
    return CORES_DESTAQUE.some((c) => c.id === v);
}

export function ehTemaCustom(tema: TemaAparencia | string | undefined): boolean {
    return tema === "custom";
}

function clamp(n: number) {
    return Math.max(0, Math.min(255, Math.round(n)));
}

function hexParaRgb(hex: string): [number, number, number] {
    const h = hex.replace("#", "");
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function rgbParaHex(r: number, g: number, b: number) {
    return `#${[r, g, b].map((x) => clamp(x).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

function misturar(hex: string, com: string, t: number) {
    const [r1, g1, b1] = hexParaRgb(hex);
    const [r2, g2, b2] = hexParaRgb(com);
    return rgbParaHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

function escurecer(hex: string, t: number) {
    return misturar(hex, "#000000", t);
}

function clarear(hex: string, t: number) {
    return misturar(hex, "#FFFFFF", t);
}

function canalLinear(c: number) {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** Luminância relativa WCAG (0–1). */
function luminanciaRelativa(hex: string) {
    const [r, g, b] = hexParaRgb(hex);
    return 0.2126 * canalLinear(r) + 0.7152 * canalLinear(g) + 0.0722 * canalLinear(b);
}

function contrasteEntre(a: string, b: string) {
    const l1 = luminanciaRelativa(a);
    const l2 = luminanciaRelativa(b);
    const claro = Math.max(l1, l2);
    const escuro = Math.min(l1, l2);
    return (claro + 0.05) / (escuro + 0.05);
}

export function fundoEhClaro(hex: string) {
    return luminanciaRelativa(hex) > 0.45;
}

/**
 * Texto/ícone sobre fundo de destaque (botões, nav ativa, CTAs).
 * Accent claro → texto escuro; accent escuro → branco.
 */
export function derivarTextoSobreDestaque(destaqueHex: string): string {
    const hex = ehHexCor(destaqueHex) ? destaqueHex.toUpperCase() : CORES_DESTAQUE[0].hex;
    return fundoEhClaro(hex) ? TEXTO_SOBRE_DESTAQUE_CLARO : TEXTO_SOBRE_DESTAQUE_ESCURO;
}

/**
 * Fundo de página usado para validar contraste de accent-como-texto.
 */
export function resolverFundoContrasteDestaque(pref: PreferenciaTema): string {
    const tema = normalizarTema(pref.tema);
    if (ehTemaCustom(tema) && pref.corFundoTexto && ehHexCor(pref.corFundoTexto)) {
        return pref.corFundoTexto.toUpperCase();
    }
    return FUNDO_POR_TEMA[tema];
}

/**
 * Accent usado como cor de texto/ícone em superfícies claras.
 * Se o hex bruto falha contraste vs fundo, escurece até ~4.5:1.
 */
export function derivarDestaqueParaTexto(
    destaqueHex: string,
    fundoHex?: string | null,
): string {
    const accent = ehHexCor(destaqueHex) ? destaqueHex.toUpperCase() : CORES_DESTAQUE[0].hex;
    const fundo =
        (fundoHex && ehHexCor(fundoHex) && fundoHex.toUpperCase()) || FUNDO_CUSTOM_PADRAO;

    if (contrasteEntre(accent, fundo) >= CONTRASTE_SECUNDARIO_MIN) {
        return accent;
    }

    for (let t = 0.1; t <= 0.92; t += 0.05) {
        const candidato = escurecer(accent, t);
        if (contrasteEntre(candidato, fundo) >= CONTRASTE_SECUNDARIO_MIN) {
            return candidato;
        }
    }

    // Fallback: lado escuro do contraste (accent claro demais).
    return fundoEhClaro(fundo) ? TEXTO_SOBRE_DESTAQUE_CLARO : TEXTO_SOBRE_DESTAQUE_ESCURO;
}

/**
 * Título + subtítulo com contraste alto sobre um fundo hex
 * (ex.: card de tema selecionado com bg-azul-50 / hover custom).
 */
export function coresTextoSobreFundo(fundoHex: string): { titulo: string; subtitulo: string } {
    const fundo = ehHexCor(fundoHex) ? fundoHex.toUpperCase() : FUNDO_CUSTOM_PADRAO;
    const titulo = fundoEhClaro(fundo) ? TEXTO_CLARO_PADRAO : TEXTO_ESCURO_PADRAO;

    let subtitulo = misturar(titulo, fundo, 0.28);
    if (contrasteEntre(subtitulo, fundo) >= CONTRASTE_SECUNDARIO_MIN) {
        return { titulo, subtitulo };
    }

    for (let t = 0.2; t >= 0; t -= 0.05) {
        const candidato = misturar(titulo, fundo, t);
        if (contrasteEntre(candidato, fundo) >= CONTRASTE_SECUNDARIO_MIN) {
            return { titulo, subtitulo: candidato };
        }
        subtitulo = candidato;
    }

    return { titulo, subtitulo };
}

/**
 * Hex efetivo de --azul-50 (fundo do card de tema selecionado),
 * alinhado a aplicarTemaNoDocumento (hover custom sobrescreve o tom 50).
 */
export function resolverTomDestaque50(pref: PreferenciaTema): string {
    const tema = normalizarTema(pref.tema);
    const hex = resolverHexDestaque(pref.corDestaque, tema);
    if (ehTemaCustom(tema) && pref.corHover && ehHexCor(pref.corHover)) {
        return pref.corHover.toUpperCase();
    }
    const temaTons: TemaAparencia = tema === "escuro" ? "escuro" : "claro";
    return tonsDestaque(hex, temaTons)["50"];
}

/**
 * Superfícies onde o texto aparece no tema custom (página + cards).
 */
function superficiesDoTema(
    corFundoTexto: string | null | undefined,
    corSuperficie: string | null | undefined,
): { fundo: string; superficies: string[] } {
    const fundo =
        (corFundoTexto && ehHexCor(corFundoTexto) && corFundoTexto.toUpperCase()) || FUNDO_CUSTOM_PADRAO;
    const superficie =
        (corSuperficie && ehHexCor(corSuperficie) && corSuperficie.toUpperCase()) ||
        SUPERFICIE_CUSTOM_PADRAO;

    const unicas = new Set<string>([fundo, superficie]);
    return { fundo, superficies: [...unicas] };
}

/**
 * Deriva texto primário para tema custom.
 * Escolhe preto-ish (#1B2432) ou branco-ish (#F5F5F5) maximizando o
 * contraste mínimo contra fundo + superfície.
 * Em empate, prefere o melhor contraste contra o fundo da página.
 */
export function derivarTextoPrimario(
    corFundoTexto: string | null | undefined,
    corSuperficie: string | null | undefined,
): string {
    const { fundo, superficies } = superficiesDoTema(corFundoTexto, corSuperficie);
    const candidatos = [TEXTO_CLARO_PADRAO, TEXTO_ESCURO_PADRAO];

    let melhor = candidatos[0];
    let melhorMin = -1;
    let melhorVsFundo = -1;

    for (const candidato of candidatos) {
        let minContraste = Infinity;
        for (const superficie of superficies) {
            minContraste = Math.min(minContraste, contrasteEntre(candidato, superficie));
        }
        const vsFundo = contrasteEntre(candidato, fundo);
        if (minContraste > melhorMin || (minContraste === melhorMin && vsFundo > melhorVsFundo)) {
            melhor = candidato;
            melhorMin = minContraste;
            melhorVsFundo = vsFundo;
        }
    }

    return melhor;
}

/**
 * Deriva texto secundário/muted a partir do pack custom.
 * Parte do texto primário auto-derivado; mistura com o fundo e sobe contraste até ~4.5:1.
 */
export function derivarTextoSecundario(
    corFundoTexto: string | null | undefined,
    corSuperficie: string | null | undefined,
): string {
    const { fundo } = superficiesDoTema(corFundoTexto, corSuperficie);
    const texto = derivarTextoPrimario(corFundoTexto, corSuperficie);

    // Mais perto do fundo = mais “cinza”; começa suave e endurece se precisar.
    let melhor = misturar(texto, fundo, 0.42);
    if (contrasteEntre(melhor, fundo) >= CONTRASTE_SECUNDARIO_MIN) {
        return melhor;
    }

    for (let t = 0.35; t >= 0; t -= 0.05) {
        const candidato = misturar(texto, fundo, t);
        if (contrasteEntre(candidato, fundo) >= CONTRASTE_SECUNDARIO_MIN) {
            return candidato;
        }
        melhor = candidato;
    }

    // Fallback: cinza neutro no lado certo do contraste.
    return fundoEhClaro(fundo) ? "#6B7280" : "#9CA3AF";
}

/**
 * Resolve hex de destaque.
 * Presets valem em qualquer tema. Hex custom só quando tema === custom.
 */
export function resolverHexDestaque(corDestaque: string, tema: TemaAparencia = "claro"): string {
    const v = corDestaque.trim();
    const preset = CORES_DESTAQUE.find((c) => c.id === v.toLowerCase());
    if (preset) return preset.hex;
    if (ehTemaCustom(tema) && ehHexCor(v)) return v.toUpperCase();
    return CORES_DESTAQUE[0].hex;
}

/** Tons de destaque. Em escuro, 50/100/200 misturam no fundo escuro (não pastel claro). */
export function tonsDestaque(hexBase: string, tema: TemaAparencia = "claro") {
    const base = hexBase.toUpperCase();
    if (tema === "escuro") {
        const fundo = "#0F1419";
        const superficie = "#1A2332";
        return {
            "600": base,
            "700": escurecer(base, 0.22),
            "500": clarear(base, 0.18),
            "400": clarear(base, 0.28),
            "200": misturar(base, superficie, 0.55),
            "100": misturar(base, superficie, 0.72),
            "50": misturar(base, fundo, 0.82),
        };
    }
    return {
        "600": base,
        "700": escurecer(base, 0.22),
        "500": clarear(base, 0.18),
        "400": clarear(base, 0.28),
        "200": clarear(base, 0.55),
        "100": clarear(base, 0.78),
        "50": clarear(base, 0.9),
    };
}

export function preferenciaPadrao(): PreferenciaTema {
    return {
        tema: "claro",
        daltonismoTipo: "deuteranopia",
        corDestaque: "azul",
        corFundoTexto: null,
        corSuperficie: null,
        corTexto: null,
        corHover: null,
    };
}

function normalizarTema(tema: string | undefined): TemaAparencia {
    if (tema === "escuro" || tema === "leitor" || tema === "custom" || tema === "daltonismo") return tema;
    return "claro";
}

function normalizarTipoDaltonismo(tipo: string | undefined): DaltonismoTipo {
    if (
        tipo === "protanopia" ||
        tipo === "deuteranopia" ||
        tipo === "tritanopia" ||
        tipo === "acromatopsia"
    ) {
        return tipo;
    }
    return "deuteranopia";
}

export function lerPreferenciaTema(): PreferenciaTema | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = localStorage.getItem(TEMA_STORAGE_KEY);
        if (!raw) return null;
        const p = JSON.parse(raw) as PreferenciaTema;
        if (!p?.tema || !p?.corDestaque) return null;
        return {
            tema: normalizarTema(p.tema),
            daltonismoTipo: normalizarTipoDaltonismo(p.daltonismoTipo),
            corDestaque: p.corDestaque,
            corFundoTexto: p.corFundoTexto ?? null,
            corSuperficie: p.corSuperficie ?? null,
            corTexto: p.corTexto ?? null,
            corHover: p.corHover ?? null,
        };
    } catch {
        return null;
    }
}

export function salvarPreferenciaTema(pref: PreferenciaTema) {
    if (typeof window === "undefined") return;
    try {
        localStorage.setItem(TEMA_STORAGE_KEY, JSON.stringify(pref));
    } catch {
        /* ignore quota */
    }
}

const VARS_ACCENT = ["50", "100", "200", "400", "500", "600", "700"] as const;

function limparOverridesCustom(root: HTMLElement) {
    root.style.removeProperty("--fundo-texto");
    root.style.removeProperty("--background");
    root.style.removeProperty("--superficie");
    root.style.removeProperty("--card");
    root.style.removeProperty("--popover");
    root.style.removeProperty("--texto");
    root.style.removeProperty("--foreground");
    root.style.removeProperty("--azul-900");
    root.style.removeProperty("--card-foreground");
    root.style.removeProperty("--popover-foreground");
    root.style.removeProperty("--sidebar-foreground");
    root.style.removeProperty("--muted-foreground");
    root.style.removeProperty("--cinza-700");
    root.style.removeProperty("--cinza-600");
    root.style.removeProperty("--cinza-500");
}

function aplicarContrasteDestaque(root: HTMLElement, hex: string, pref: PreferenciaTema) {
    const onAccent = derivarTextoSobreDestaque(hex);
    const fundo = resolverFundoContrasteDestaque(pref);
    const textoDestaque = derivarDestaqueParaTexto(hex, fundo);
    root.style.setProperty("--azul-600-foreground", onAccent);
    root.style.setProperty("--cor-destaque-texto", textoDestaque);
    root.style.setProperty("--primary-foreground", onAccent);
}

function aplicarTextoSecundario(root: HTMLElement, pref: PreferenciaTema) {
    const sec = derivarTextoSecundario(pref.corFundoTexto, pref.corSuperficie);
    root.style.setProperty("--muted-foreground", sec);
    root.style.setProperty("--cinza-700", sec);
    root.style.setProperty("--cinza-600", misturar(sec, "#000000", 0.08));
    root.style.setProperty("--cinza-500", misturar(sec, "#FFFFFF", 0.18));
}

/**
 * Aplica tema no <html> via data-tema + CSS variables.
 * Pack custom (hex accent, fundo, superfície, hover) só com tema === "custom".
 * Texto primário e secundário são derivados automaticamente do contraste com as superfícies.
 * Presets de destaque valem em claro/escuro/leitor/custom.
 */
export function aplicarTemaNoDocumento(pref: PreferenciaTema) {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const tema = normalizarTema(pref.tema);
    const customAtivo = ehTemaCustom(tema);
    root.setAttribute("data-tema", tema);

    const tipoDaltonismo = normalizarTipoDaltonismo(pref.daltonismoTipo);
    const hex = resolverHexDestaque(pref.corDestaque, tema);
    const tons =
        tema === "daltonismo"
            ? PALETAS_DALTONISMO[tipoDaltonismo]
            : tonsDestaque(hex, tema === "escuro" ? "escuro" : "claro");
    for (const k of VARS_ACCENT) {
        root.style.setProperty(`--azul-${k}`, tons[k]);
    }
    aplicarContrasteDestaque(root, tons["600"], { ...pref, tema, daltonismoTipo: tipoDaltonismo });

    if (!customAtivo) {
        limparOverridesCustom(root);
        return;
    }

    const customFundo = pref.corFundoTexto && ehHexCor(pref.corFundoTexto);
    if (customFundo) {
        const fundo = pref.corFundoTexto!.toUpperCase();
        root.style.setProperty("--fundo-texto", fundo);
        root.style.setProperty("--background", fundo);
    } else {
        root.style.removeProperty("--fundo-texto");
        root.style.removeProperty("--background");
    }

    const customSuperficie = pref.corSuperficie && ehHexCor(pref.corSuperficie);
    if (customSuperficie) {
        const superficie = pref.corSuperficie!.toUpperCase();
        root.style.setProperty("--superficie", superficie);
        root.style.setProperty("--card", superficie);
        root.style.setProperty("--popover", superficie);
    } else {
        root.style.removeProperty("--superficie");
        root.style.removeProperty("--card");
        root.style.removeProperty("--popover");
    }

    const texto = derivarTextoPrimario(pref.corFundoTexto, pref.corSuperficie);
    root.style.setProperty("--texto", texto);
    root.style.setProperty("--foreground", texto);
    root.style.setProperty("--azul-900", texto);
    root.style.setProperty("--card-foreground", texto);
    root.style.setProperty("--popover-foreground", texto);
    root.style.setProperty("--sidebar-foreground", texto);

    aplicarTextoSecundario(root, pref);

    const customHover = pref.corHover && ehHexCor(pref.corHover);
    if (customHover) {
        const hover = pref.corHover!.toUpperCase();
        root.style.setProperty("--azul-50", hover);
        root.style.setProperty("--azul-100", misturar(hover, hex, 0.25));
    }
}

export function limparTemaNoDocumento() {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.setAttribute("data-tema", "claro");
    for (const k of VARS_ACCENT) {
        root.style.removeProperty(`--azul-${k}`);
    }
    root.style.removeProperty("--azul-600-foreground");
    root.style.removeProperty("--cor-destaque-texto");
    root.style.removeProperty("--primary-foreground");
    limparOverridesCustom(root);
}

/** Força o chrome claro padrão (admin). Equivale a limpar overrides de tema no <html>. */
export function forcarTemaClaroAdmin() {
    limparTemaNoDocumento();
}

/** Restaura o tema do usuário a partir do localStorage (ou padrão). */
export function restaurarTemaUsuarioNoDocumento() {
    aplicarTemaNoDocumento(lerPreferenciaTema() ?? preferenciaPadrao());
}

export function ehPathnameAdmin(pathname: string | null | undefined): boolean {
    if (!pathname) return false;
    return pathname === "/admin" || pathname.startsWith("/admin/");
}

/** Script inline para layout (antes da pintura). Inclui contraste de destaque e texto primário/secundário. */
export const SCRIPT_TEMA_ANTES_PAINT = `(function(){try{if(/^\\/admin(\\/|$)/.test(location.pathname))return;var k=${JSON.stringify(TEMA_STORAGE_KEY)};var r=localStorage.getItem(k);if(!r)return;var p=JSON.parse(r);if(!p||!p.tema)return;var d=document.documentElement;var tema=p.tema==="escuro"||p.tema==="leitor"||p.tema==="custom"?p.tema:"claro";d.setAttribute("data-tema",tema);var custom=tema==="custom";var presets={azul:"#0048FF",verde:"#059669",rosa:"#DB2777",roxo:"#7C3AED",laranja:"#EA580C",amarelo:"#CA8A04"};var raw=String(p.corDestaque||"");var preset=presets[raw.toLowerCase()];var hex=preset||(custom&&/^#[0-9A-Fa-f]{6}$/.test(raw)?raw.toUpperCase():"#0048FF");function mix(a,b,t){a=a.replace("#","");b=b.replace("#","");var o="#";for(var i=0;i<3;i++){var x=parseInt(a.slice(i*2,i*2+2),16),y=parseInt(b.slice(i*2,i*2+2),16);o+=Math.max(0,Math.min(255,Math.round(x+(y-x)*t))).toString(16).padStart(2,"0")}return o.toUpperCase()}function lin(c){c=c/255;return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4)}function lum(h){h=h.replace("#","");return 0.2126*lin(parseInt(h.slice(0,2),16))+0.7152*lin(parseInt(h.slice(2,4),16))+0.0722*lin(parseInt(h.slice(4,6),16))}function contrast(a,b){var x=lum(a),y=lum(b),hi=Math.max(x,y),lo=Math.min(x,y);return(hi+0.05)/(lo+0.05)}function hexOk(v){return v&&/^#[0-9A-Fa-f]{6}$/.test(v)}function surfaces(fundo,superficie){var bg=hexOk(fundo)?fundo.toUpperCase():"#E8EAED";var sf=hexOk(superficie)?superficie.toUpperCase():"#FFFFFF";var set={};set[bg]=1;set[sf]=1;return{fundo:bg,list:Object.keys(set)}}function primText(fundo,superficie){var s=surfaces(fundo,superficie);var cands=["#1B2432","#F5F5F5"];var best=cands[0],bestMin=-1,bestBg=-1;for(var i=0;i<cands.length;i++){var cand=cands[i],minC=1/0;for(var j=0;j<s.list.length;j++)minC=Math.min(minC,contrast(cand,s.list[j]));var vs=contrast(cand,s.fundo);if(minC>bestMin||(minC===bestMin&&vs>bestBg)){best=cand;bestMin=minC;bestBg=vs}}return best}function secText(fundo,superficie){var bg=surfaces(fundo,superficie).fundo;var tx=primText(fundo,superficie);var best=mix(tx,bg,0.42);if(contrast(best,bg)>=4.5)return best;for(var t=0.35;t>=0;t-=0.05){var c=mix(tx,bg,t);if(contrast(c,bg)>=4.5)return c;best=c}return lum(bg)>0.45?"#6B7280":"#9CA3AF"}function onAccent(h){return lum(h)>0.45?"#1B2432":"#FFFFFF"}function accentText(h,fundo){var bg=hexOk(fundo)?fundo.toUpperCase():(tema==="escuro"?"#0F1419":tema==="leitor"?"#EDE6D9":"#E8EAED");if(contrast(h,bg)>=4.5)return h;for(var t=0.1;t<=0.92;t+=0.05){var c=mix(h,"#000000",t);if(contrast(c,bg)>=4.5)return c}return lum(bg)>0.45?"#1B2432":"#FFFFFF"}d.style.setProperty("--azul-600",hex);d.style.setProperty("--azul-700",mix(hex,"#000000",0.22));d.style.setProperty("--azul-500",mix(hex,"#FFFFFF",0.18));d.style.setProperty("--azul-400",mix(hex,"#FFFFFF",0.28));if(tema==="escuro"){d.style.setProperty("--azul-200",mix(hex,"#1A2332",0.55));d.style.setProperty("--azul-100",mix(hex,"#1A2332",0.72));d.style.setProperty("--azul-50",mix(hex,"#0F1419",0.82))}else{d.style.setProperty("--azul-200",mix(hex,"#FFFFFF",0.55));d.style.setProperty("--azul-100",mix(hex,"#FFFFFF",0.78));d.style.setProperty("--azul-50",mix(hex,"#FFFFFF",0.9))}var oa=onAccent(hex);var at=accentText(hex,custom?p.corFundoTexto:null);d.style.setProperty("--azul-600-foreground",oa);d.style.setProperty("--cor-destaque-texto",at);d.style.setProperty("--primary-foreground",oa);if(!custom)return;if(hexOk(p.corFundoTexto)){var f=p.corFundoTexto.toUpperCase();d.style.setProperty("--fundo-texto",f);d.style.setProperty("--background",f)}if(hexOk(p.corSuperficie)){var sf=p.corSuperficie.toUpperCase();d.style.setProperty("--superficie",sf);d.style.setProperty("--card",sf);d.style.setProperty("--popover",sf)}var tx=primText(p.corFundoTexto,p.corSuperficie);d.style.setProperty("--texto",tx);d.style.setProperty("--foreground",tx);d.style.setProperty("--azul-900",tx);d.style.setProperty("--card-foreground",tx);d.style.setProperty("--popover-foreground",tx);d.style.setProperty("--sidebar-foreground",tx);var sec=secText(p.corFundoTexto,p.corSuperficie);d.style.setProperty("--muted-foreground",sec);d.style.setProperty("--cinza-700",sec);d.style.setProperty("--cinza-600",mix(sec,"#000000",0.08));d.style.setProperty("--cinza-500",mix(sec,"#FFFFFF",0.18));if(hexOk(p.corHover)){var h=p.corHover.toUpperCase();d.style.setProperty("--azul-50",h);d.style.setProperty("--azul-100",mix(h,hex,0.25))}}catch(e){}})();`;


