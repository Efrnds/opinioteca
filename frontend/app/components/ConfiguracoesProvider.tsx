"use client";

import {
    CONFIG_PADRAO,
    type ConfiguracaoUsuario,
} from "@/types/configuracao";
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
                setConfig({ ...CONFIG_PADRAO, ...data });
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
        }
    }, [status, nick, recarregar]);

    const salvar = useCallback(
        async (parcial: Partial<ConfiguracaoUsuario>) => {
            if (!nick) {
                return null;
            }
            const proximo = { ...config, ...parcial };
            setConfig(proximo);
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
            setConfig({ ...CONFIG_PADRAO, ...data });
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
