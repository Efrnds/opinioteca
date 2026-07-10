import { limparCachePreviewAvatar } from "@/lib/avatar";
import { useSyncExternalStore } from "react";

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

/** Versão sobe a cada apply — getSnapshot do useSyncExternalStore muda de forma confiável. */
let acessibilidadeEpoch = 0;
const acessibilidadeListeners = new Set<() => void>();

function notificarAcessibilidadeListeners() {
    acessibilidadeEpoch += 1;
    acessibilidadeListeners.forEach((listener) => listener());
}

function subscribeAcessibilidade(onStoreChange: () => void) {
    acessibilidadeListeners.add(onStoreChange);
    if (typeof window !== "undefined") {
        window.addEventListener(ACESSIBILIDADE_EVENT, onStoreChange);
        window.addEventListener("storage", onStoreChange);
    }
    return () => {
        acessibilidadeListeners.delete(onStoreChange);
        if (typeof window !== "undefined") {
            window.removeEventListener(ACESSIBILIDADE_EVENT, onStoreChange);
            window.removeEventListener("storage", onStoreChange);
        }
    };
}

function lerReducaoMovimentoSnapshot(): boolean {
    if (typeof document !== "undefined") {
        if (document.documentElement.getAttribute("data-acess-reduce-motion") === "true") {
            return true;
        }
    }
    if (typeof window === "undefined") return false;
    try {
        const raw = localStorage.getItem(ACESSIBILIDADE_STORAGE_KEY);
        if (!raw) return false;
        const parsed = JSON.parse(raw) as { reduzirMovimento?: boolean };
        return !!parsed.reduzirMovimento;
    } catch {
        return false;
    }
}

/**
 * Snapshot com epoch: garante que o React re-renderize após apply mesmo se o boolean
 * for lido antes do atributo DOM/localStorage estabilizar no mesmo tick.
 */
function lerReducaoMovimentoSnapshotComEpoch(): boolean {
    void acessibilidadeEpoch;
    return lerReducaoMovimentoSnapshot();
}

/** Preferência "Reduzir movimento" via store externo (fallback; preferir Context). */
export function useReducaoMovimento(): boolean {
    return useSyncExternalStore(
        subscribeAcessibilidade,
        lerReducaoMovimentoSnapshotComEpoch,
        () => false,
    );
}

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

export function aplicarPreferenciasAcessibilidadeNoDocumento(pref: PreferenciasAcessibilidade) {
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
        limparCachePreviewAvatar();
        // Fora do render atual: avatares escutam via useSyncExternalStore / evento.
        queueMicrotask(() => {
            notificarAcessibilidadeListeners();
            window.dispatchEvent(new Event(ACESSIBILIDADE_EVENT));
        });
    }
}

export function aplicarAcessibilidadeSalvaNoDocumento() {
    aplicarPreferenciasAcessibilidadeNoDocumento(lerPreferenciasAcessibilidade());
}
