import { limparCachePreviewAvatar } from "@/lib/avatar";

export type TamanhoFonteAcessibilidade = "padrao" | "grande" | "extra";

export type PreferenciasAcessibilidade = {
    reduzirMovimento: boolean;
    altoContraste: boolean;
    focoVisivel: boolean;
    tamanhoFonte: TamanhoFonteAcessibilidade;
};

const ACESSIBILIDADE_STORAGE_KEY = "opinioteca-acessibilidade";
const ACESSIBILIDADE_EVENT = "opinioteca:acessibilidade-change";

const ACESSIBILIDADE_PADRAO: PreferenciasAcessibilidade = {
    reduzirMovimento: false,
    altoContraste: false,
    focoVisivel: true,
    tamanhoFonte: "padrao",
};

function normalizarTamanhoFonte(v: string | undefined): TamanhoFonteAcessibilidade {
    if (v === "grande" || v === "extra") return v;
    return "padrao";
}

export function lerPreferenciasAcessibilidade(): PreferenciasAcessibilidade {
    if (typeof window === "undefined") return ACESSIBILIDADE_PADRAO;
    try {
        const raw = localStorage.getItem(ACESSIBILIDADE_STORAGE_KEY);
        if (!raw) return ACESSIBILIDADE_PADRAO;
        const parsed = JSON.parse(raw) as Partial<PreferenciasAcessibilidade>;
        return {
            reduzirMovimento: !!parsed.reduzirMovimento,
            altoContraste: !!parsed.altoContraste,
            focoVisivel: parsed.focoVisivel !== false,
            tamanhoFonte: normalizarTamanhoFonte(parsed.tamanhoFonte),
        };
    } catch {
        return ACESSIBILIDADE_PADRAO;
    }
}

export function salvarPreferenciasAcessibilidade(pref: PreferenciasAcessibilidade) {
    if (typeof window === "undefined") return;
    try {
        localStorage.setItem(ACESSIBILIDADE_STORAGE_KEY, JSON.stringify(pref));
    } catch {
        // ignore storage quota
    }
}

export function aplicarPreferenciasAcessibilidadeNoDocumento(
    pref: PreferenciasAcessibilidade,
    opts?: { limparStillCache?: boolean },
) {
    if (typeof document === "undefined") return;
    const root = document.documentElement;

    root.setAttribute("data-acess-font", pref.tamanhoFonte);

    if (pref.reduzirMovimento) root.setAttribute("data-acess-reduce-motion", "true");
    else root.removeAttribute("data-acess-reduce-motion");

    if (pref.altoContraste) root.setAttribute("data-acess-contraste", "alto");
    else root.removeAttribute("data-acess-contraste");

    if (pref.focoVisivel) root.setAttribute("data-acess-foco", "alto");
    else root.removeAttribute("data-acess-foco");

    if (typeof window !== "undefined") {
        if (opts?.limparStillCache) {
            limparCachePreviewAvatar();
        }
        queueMicrotask(() => {
            window.dispatchEvent(new Event(ACESSIBILIDADE_EVENT));
        });
    }
}

export function aplicarAcessibilidadeSalvaNoDocumento() {
    aplicarPreferenciasAcessibilidadeNoDocumento(lerPreferenciasAcessibilidade(), {
        limparStillCache: true,
    });
}
