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
    useRef,
    useState,
    type ReactNode,
} from "react";

type AcessibilidadeContextValue = {
    prefs: PreferenciasAcessibilidade;
    reduzirMovimento: boolean;
    atualizar: (parcial: Partial<PreferenciasAcessibilidade>) => void;
};

const ACESSIBILIDADE_PADRAO: PreferenciasAcessibilidade = {
    reduzirMovimento: false,
    altoContraste: false,
    focoVisivel: true,
    tamanhoFonte: "padrao",
};

const AcessibilidadeContext = createContext<AcessibilidadeContextValue | null>(null);

export function AcessibilidadeProvider({ children }: { children: ReactNode }) {
    const [prefs, setPrefs] = useState<PreferenciasAcessibilidade>(ACESSIBILIDADE_PADRAO);
    const [pronto, setPronto] = useState(false);
    const motionAnterior = useRef<boolean | null>(null);

    useEffect(() => {
        const salvas = lerPreferenciasAcessibilidade();
        setPrefs(salvas);
        motionAnterior.current = salvas.reduzirMovimento;
        aplicarPreferenciasAcessibilidadeNoDocumento(salvas, { limparStillCache: true });
        setPronto(true);
    }, []);

    useEffect(() => {
        if (!pronto) return;
        const limparStill =
            motionAnterior.current !== null && motionAnterior.current !== prefs.reduzirMovimento;
        motionAnterior.current = prefs.reduzirMovimento;
        aplicarPreferenciasAcessibilidadeNoDocumento(prefs, { limparStillCache: limparStill });
        salvarPreferenciasAcessibilidade(prefs);
    }, [prefs, pronto]);

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

export function useReducaoMovimentoPreferida(): boolean {
    const ctx = useContext(AcessibilidadeContext);
    return ctx?.reduzirMovimento ?? false;
}
