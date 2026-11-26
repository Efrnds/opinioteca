"use client";
import type { PlanoCatalogo, PlanoStatus } from "@/types/plano";
import { useSession } from "next-auth/react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode, } from "react";

type PlanoContextValue = {
    plano: PlanoStatus | null;
    catalogo: PlanoCatalogo[];
    carregando: boolean;
    modoZen: boolean;
    recarregar: () => Promise<void>;
    alternarModoZen: () => Promise<boolean>;
    temPlanoTop: boolean;
    temPlanoPro: boolean;
    planoAtivo: boolean;
};

const PlanoContext = createContext<PlanoContextValue | null>(null);

const PLANO_GRATUITO: PlanoStatus = {
    codigo: "gratuito",
    nome: "Gratuito",
    assinaturaId: 1,
    ativo: true,
    temPlanoTop: false,
    temPlanoPro: false,
};

export function PlanoProvider({ children }: {
    children: ReactNode;
}) {
    const { data: session, status } = useSession();
    const nick = session?.user?.nick;
    const [plano, setPlano] = useState<PlanoStatus | null>(null);
    const [catalogo, setCatalogo] = useState<PlanoCatalogo[]>([]);
    const [modoZenDb, setModoZenDb] = useState(false);
    const [carregando, setCarregando] = useState(false);
    const limpandoZenRef = useRef(false);

    const recarregar = useCallback(async () => {
        if (status !== "authenticated" || !nick) {
            setPlano(null);
            setModoZenDb(false);
            return;
        }
        setCarregando(true);
        try {
            const [resPlano, resCatalogo, resPerfil] = await Promise.all([
                fetch("/api/plano"),
                fetch("/api/planos"),
                fetch(`/api/usuarios/${encodeURIComponent(nick)}`),
            ]);
            let planoCarregado: PlanoStatus = PLANO_GRATUITO;
            if (resPlano.ok) {
                planoCarregado = (await resPlano.json()) as PlanoStatus;
                setPlano(planoCarregado);
            }
            else {
                setPlano(PLANO_GRATUITO);
            }
            if (resCatalogo.ok) {
                const data = await resCatalogo.json();
                setCatalogo(Array.isArray(data) ? data : []);
            }
            if (resPerfil.ok) {
                const perfil = await resPerfil.json();
                const zen = Boolean(perfil.modoZen);
                setModoZenDb(zen && Boolean(planoCarregado.temPlanoPro));
            }
        }
        finally {
            setCarregando(false);
        }
    }, [status, nick]);

    const efetivo = plano ?? PLANO_GRATUITO;
    const temPlanoPro = efetivo.temPlanoPro;
    const modoZen = modoZenDb && temPlanoPro;

    useEffect(() => {
        if (!nick || !modoZenDb || temPlanoPro || limpandoZenRef.current)
            return;
        limpandoZenRef.current = true;
        void fetch(`/api/usuarios/${encodeURIComponent(nick)}/modo-zen`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ modoZen: false }),
        })
            .then((res) => {
                if (res.ok)
                    setModoZenDb(false);
            })
            .finally(() => {
                limpandoZenRef.current = false;
            });
    }, [nick, modoZenDb, temPlanoPro]);

    const alternarModoZen = useCallback(async () => {
        if (!nick)
            return false;
        if (!temPlanoPro && !modoZen)
            return false;
        const novo = !modoZen;
        const res = await fetch(`/api/usuarios/${encodeURIComponent(nick)}/modo-zen`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ modoZen: novo }),
        });
        if (!res.ok)
            return false;
        setModoZenDb(novo);
        return true;
    }, [nick, modoZen, temPlanoPro]);

    useEffect(() => {
        if (status === "authenticated") {
            void recarregar();
        }
        if (status === "unauthenticated") {
            setPlano(null);
            setCatalogo([]);
            setModoZenDb(false);
        }
    }, [status, recarregar]);

    const value = useMemo(() => ({
        plano,
        catalogo,
        carregando,
        modoZen,
        recarregar,
        alternarModoZen,
        temPlanoTop: efetivo.temPlanoTop,
        temPlanoPro,
        planoAtivo: efetivo.ativo,
    }), [plano, catalogo, carregando, modoZen, recarregar, alternarModoZen, efetivo, temPlanoPro]);

    return <PlanoContext.Provider value={value}>{children}</PlanoContext.Provider>;
}

export function usePlano() {
    const ctx = useContext(PlanoContext);
    if (!ctx) {
        throw new Error("usePlano deve ser usado dentro de PlanoProvider");
    }
    return ctx;
}
