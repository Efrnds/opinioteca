"use client";

import type { DiarioResposta } from "@/types/diario";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";

export function useDiario() {
    const { data: session } = useSession();
    const [diario, setDiario] = useState<DiarioResposta | null>(null);
    const [carregando, setCarregando] = useState(true);

    const nick = session?.user?.nick;
    const diaHoje = new Date().getDay();

    const carregarDiario = useCallback(async () => {
        if (!nick) {
            setCarregando(false);
            return;
        }

        setCarregando(true);
        try {
            const res = await fetch(`/api/diario/${encodeURIComponent(nick)}`);
            const data: DiarioResposta = await res.json();
            if (res.ok) {
                setDiario(data);
            }
        } catch {
            setDiario(null);
        } finally {
            setCarregando(false);
        }
    }, [nick]);

    useEffect(() => {
        carregarDiario();
    }, [carregarDiario]);

    useEffect(() => {
        function onRefresh() {
            carregarDiario();
        }

        window.addEventListener("diario:refresh", onRefresh);
        return () => window.removeEventListener("diario:refresh", onRefresh);
    }, [carregarDiario]);

    const sequencia = diario?.semana ?? [];
    const streak = diario?.sequencia_atual ?? 0;
    const jaLeuHoje = !carregando && !!sequencia[diaHoje]?.leu;

    return { diario, carregando, sequencia, streak, jaLeuHoje, diaHoje };
}
