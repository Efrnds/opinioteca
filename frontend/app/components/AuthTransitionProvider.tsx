"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

type AuthTransitionContextValue = {
    isAuthTransitioning: boolean;
    startAuthTransition: () => void;
    endAuthTransition: () => void;
};

const AuthTransitionContext = createContext<AuthTransitionContextValue | null>(null);

export function AuthTransitionProvider({ children }: { children: React.ReactNode }) {
    const [isAuthTransitioning, setIsAuthTransitioning] = useState(false);

    const startAuthTransition = useCallback(() => {
        setIsAuthTransitioning(true);
    }, []);

    const endAuthTransition = useCallback(() => {
        setIsAuthTransitioning(false);
    }, []);

    const value = useMemo(
        () => ({ isAuthTransitioning, startAuthTransition, endAuthTransition }),
        [isAuthTransitioning, startAuthTransition, endAuthTransition],
    );

    return <AuthTransitionContext.Provider value={value}>{children}</AuthTransitionContext.Provider>;
}

export function useAuthTransition() {
    const context = useContext(AuthTransitionContext);
    if (!context) {
        throw new Error("useAuthTransition must be used within AuthTransitionProvider");
    }
    return context;
}
