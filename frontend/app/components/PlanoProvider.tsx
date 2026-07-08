/**
 * Infraestrutura de planos/assinatura — ver docs/planos-assinatura.md
 *
 * usePlano() expõe o plano do usuário logado (GET /api/plano).
 * Outros módulos devem usar temPlanoTop / temPlanoPro para feature gates.
 */
"use client";

import type { PlanoCatalogo, PlanoStatus } from "@/types/plano";
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

export function PlanoProvider({ children }: { children: ReactNode }) {
    const { data: session, status } = useSession();
    const nick = session?.user?.nick;
    const [plano, setPlano] = useState<PlanoStatus | null>(null);
    const [catalogo, setCatalogo] = useState<PlanoCatalogo[]>([]);
    const [modoZen, setModoZen] = useState(false);
    const [carregando, setCarregando] = useState(false);

    const recarregar = useCallback(async () => {
        if (status !== "authenticated" || !nick) {
            setPlano(null);
            setModoZen(false);
            return;
        }
        setCarregando(true);
        try {
            const [resPlano, resCatalogo, resPerfil] = await Promise.all([
                fetch("/api/plano"),
                fetch("/api/planos"),
                fetch(`/api/usuarios/${encodeURIComponent(nick)}`),
            ]);
            if (resPlano.ok) {
                setPlano((await resPlano.json()) as PlanoStatus);
            } else {
                setPlano(PLANO_GRATUITO);
            }
            if (resCatalogo.ok) {
                const data = await resCatalogo.json();
                setCatalogo(Array.isArray(data) ? data : []);
            }
            if (resPerfil.ok) {
                const perfil = await resPerfil.json();
                setModoZen(Boolean(perfil.modoZen));
            }
        } finally {
            setCarregando(false);
        }
    }, [status, nick]);

    const alternarModoZen = useCallback(async () => {
        if (!nick) return false;
        const novo = !modoZen;
        const res = await fetch(`/api/usuarios/${encodeURIComponent(nick)}/modo-zen`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ modoZen: novo }),
        });
        if (!res.ok) return false;
        setModoZen(novo);
        return true;
    }, [nick, modoZen]);

    useEffect(() => {
        if (status === "authenticated") {
            void recarregar();
        }
        if (status === "unauthenticated") {
            setPlano(null);
            setCatalogo([]);
            setModoZen(false);
        }
    }, [status, recarregar]);

    const efetivo = plano ?? PLANO_GRATUITO;

    const value = useMemo(
        () => ({
            plano,
            catalogo,
            carregando,
            modoZen,
            recarregar,
            alternarModoZen,
            temPlanoTop: efetivo.temPlanoTop,
            temPlanoPro: efetivo.temPlanoPro,
            planoAtivo: efetivo.ativo,
        }),
        [plano, catalogo, carregando, modoZen, recarregar, alternarModoZen, efetivo],
    );

    return <PlanoContext.Provider value={value}>{children}</PlanoContext.Provider>;
}

export function usePlano() {
    const ctx = useContext(PlanoContext);
    if (!ctx) {
        throw new Error("usePlano deve ser usado dentro de PlanoProvider");
    }
    return ctx;
}
