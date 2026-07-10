"use client";

import {
    aplicarPreferenciasAcessibilidadeNoDocumento,
    lerPreferenciasAcessibilidade,
    salvarPreferenciasAcessibilidade,
    type PreferenciasAcessibilidade,
} from "@/lib/acessibilidade";
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";

type AcessibilidadeContextValue = {
    prefs: PreferenciasAcessibilidade;
    reduzirMovimento: boolean;
    atualizar: (parcial: Partial<PreferenciasAcessibilidade>) => void;
};

const AcessibilidadeContext = createContext<AcessibilidadeContextValue | null>(null);

export function AcessibilidadeProvider({ children }: { children: ReactNode }) {
    const [prefs, setPrefs] = useState<PreferenciasAcessibilidade>(lerPreferenciasAcessibilidade);
    const [hidratado, setHidratado] = useState(false);

    useEffect(() => {
        const salvas = lerPreferenciasAcessibilidade();
        setPrefs(salvas);
        aplicarPreferenciasAcessibilidadeNoDocumento(salvas);
        setHidratado(true);
    }, []);

    useEffect(() => {
        if (!hidratado) return;
        aplicarPreferenciasAcessibilidadeNoDocumento(prefs);
        salvarPreferenciasAcessibilidade(prefs);
    }, [prefs, hidratado]);

    const atualizar = useCallback((parcial: Partial<PreferenciasAcessibilidade>) => {
        setPrefs((anterior) => ({ ...anterior, ...parcial }));
    }, []);

    const value = useMemo(
        () => ({
            prefs,
            reduzirMovimento: prefs.reduzirMovimento,
            atualizar,
        }),
        [prefs, atualizar],
    );

    return <AcessibilidadeContext.Provider value={value}>{children}</AcessibilidadeContext.Provider>;
}

export function useAcessibilidade(): AcessibilidadeContextValue {
    const ctx = useContext(AcessibilidadeContext);
    if (!ctx) {
        throw new Error("useAcessibilidade deve ser usado dentro de AcessibilidadeProvider");
    }
    return ctx;
}

/** Versão segura para avatares: sem provider → false (não quebra páginas isoladas). */
export function useReducaoMovimentoPreferida(): boolean {
    const ctx = useContext(AcessibilidadeContext);
    return ctx?.reduzirMovimento ?? false;
}
