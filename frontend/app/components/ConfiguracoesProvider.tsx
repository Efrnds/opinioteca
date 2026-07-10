"use client";

import {
    CONFIG_PADRAO,
    type ConfiguracaoUsuario,
} from "@/types/configuracao";
import {
    aplicarTemaNoDocumento,
    ehPathnameAdmin,
    limparTemaNoDocumento,
    preferenciaPadrao,
    salvarPreferenciaTema,
} from "@/lib/tema";
import { useSession } from "next-auth/react";
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";

type ConfiguracoesContextValue = {
    config: ConfiguracaoUsuario;
    carregando: boolean;
    recarregar: () => Promise<void>;
    salvar: (parcial: Partial<ConfiguracaoUsuario>) => Promise<ConfiguracaoUsuario | null>;
};

const ConfiguracoesContext = createContext<ConfiguracoesContextValue | null>(null);

function preferenciaDeConfig(config: ConfiguracaoUsuario) {
    return {
        tema: config.tema ?? "claro",
        daltonismoTipo: config.daltonismoTipo ?? "deuteranopia",
        corDestaque: config.corDestaque ?? "azul",
        corFundoTexto: config.corFundoTexto ?? null,
        corSuperficie: config.corSuperficie ?? null,
        corTexto: config.corTexto ?? null,
        corHover: config.corHover ?? null,
    };
}

function podeAplicarTemaNoDocumento() {
    if (typeof window === "undefined") return false;
    return !ehPathnameAdmin(window.location.pathname);
}

function sincronizarTema(config: ConfiguracaoUsuario, aplicarNoDocumento: boolean) {
    const pref = preferenciaDeConfig(config);
    salvarPreferenciaTema(pref);
    if (aplicarNoDocumento) {
        aplicarTemaNoDocumento(pref);
    }
}

export function ConfiguracoesProvider({ children }: { children: ReactNode }) {
    const { data: session, status } = useSession();
    const nick = session?.user?.nick;
    const [config, setConfig] = useState<ConfiguracaoUsuario>(CONFIG_PADRAO);
    const [carregando, setCarregando] = useState(false);

    const recarregar = useCallback(async () => {
        if (!nick) {
            return;
        }
        setCarregando(true);
        try {
            const res = await fetch(`/api/usuarios/${encodeURIComponent(nick)}/configuracoes`);
            if (res.ok) {
                const data = (await res.json()) as ConfiguracaoUsuario;
                const merged = { ...CONFIG_PADRAO, ...data };
                setConfig(merged);
                // Checa pathname no momento da resposta (evita sobrescrever o admin após navegação).
                sincronizarTema(merged, podeAplicarTemaNoDocumento());
            }
        } finally {
            setCarregando(false);
        }
    }, [nick]);

    useEffect(() => {
        if (status === "authenticated" && nick) {
            void recarregar();
        }
        if (status === "unauthenticated") {
            setConfig(CONFIG_PADRAO);
            if (podeAplicarTemaNoDocumento()) {
                limparTemaNoDocumento();
            }
            salvarPreferenciaTema(preferenciaPadrao());
        }
    }, [status, nick, recarregar]);

    const salvar = useCallback(
        async (parcial: Partial<ConfiguracaoUsuario>) => {
            if (!nick) {
                return null;
            }
            const proximo = { ...config, ...parcial };
            setConfig(proximo);
            sincronizarTema(proximo, podeAplicarTemaNoDocumento());
            const res = await fetch(`/api/usuarios/${encodeURIComponent(nick)}/configuracoes`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(proximo),
            });
            if (!res.ok) {
                await recarregar();
                return null;
            }
            const data = (await res.json()) as ConfiguracaoUsuario;
            const merged = { ...CONFIG_PADRAO, ...data };
            setConfig(merged);
            sincronizarTema(merged, podeAplicarTemaNoDocumento());
            return data;
        },
        [nick, config, recarregar],
    );

    const value = useMemo(
        () => ({ config, carregando, recarregar, salvar }),
        [config, carregando, recarregar, salvar],
    );

    return <ConfiguracoesContext.Provider value={value}>{children}</ConfiguracoesContext.Provider>;
}

export function useConfiguracoes() {
    const ctx = useContext(ConfiguracoesContext);
    if (!ctx) {
        throw new Error("useConfiguracoes deve ser usado dentro de ConfiguracoesProvider");
    }
    return ctx;
}
