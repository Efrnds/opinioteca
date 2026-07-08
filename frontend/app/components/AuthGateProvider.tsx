"use client";

import AuthModal from "@/app/components/AuthModal";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";

type AuthMode = "login" | "cadastro";

type AuthGateContextValue = {
    abrirAuth: (mode?: AuthMode) => void;
    /** Se guest, abre AuthModal e retorna false; se autenticado, retorna true. */
    exigirAuth: () => boolean;
};

const AuthGateContext = createContext<AuthGateContextValue | null>(null);

export function AuthGateProvider({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const { status } = useSession();
    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState<AuthMode>("login");

    useEffect(() => {
        if (status === "authenticated") {
            setOpen(false);
        }
    }, [status]);

    const abrirAuth = useCallback((modo: AuthMode = "login") => {
        setMode(modo);
        setOpen(true);
    }, []);

    const exigirAuth = useCallback(() => {
        if (status === "authenticated") {
            return true;
        }
        abrirAuth("login");
        return false;
    }, [status, abrirAuth]);

    const value = useMemo(() => ({ abrirAuth, exigirAuth }), [abrirAuth, exigirAuth]);

    return (
        <AuthGateContext.Provider value={value}>
            {children}
            <AuthModal
                open={open}
                mode={mode}
                onClose={() => setOpen(false)}
                onSwitchMode={setMode}
                callbackUrl={pathname || "/home"}
            />
        </AuthGateContext.Provider>
    );
}

export function useAuthGate() {
    const ctx = useContext(AuthGateContext);
    if (!ctx) {
        throw new Error("useAuthGate deve ser usado dentro de AuthGateProvider");
    }
    return ctx;
}
