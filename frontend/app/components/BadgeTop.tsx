import { badgePlano } from "@/lib/plano";
import type { PlanoStatus } from "@/types/plano";
import { cn } from "@/lib/utils";

type BadgeTopProps = {
    assinaturaId?: number | null;
    plano?: PlanoStatus;
    temPlanoTop?: boolean;
    temPlanoPro?: boolean;
    className?: string;
};

/** Badge de plano ao lado do nome: PRO (OpinioPro) ou TOP (OpinioTop). */
export default function BadgeTop({
    assinaturaId,
    plano,
    temPlanoTop,
    temPlanoPro,
    className = "",
}: BadgeTopProps) {
    // assinaturaId/plano têm prioridade: PRO (id 3) também define temPlanoTop=true no feed.
    let tipo = badgePlano(assinaturaId ?? undefined, plano);
    if (!tipo) {
        if (temPlanoPro) tipo = "pro";
        else if (temPlanoTop) tipo = "top";
    }
    if (!tipo) return null;

    const ehPro = tipo === "pro";

    return (
        <span
            className={cn(
                "inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 font-gabarito-bold text-[9px] uppercase leading-none tracking-wide",
                ehPro
                    ? "bg-gradient-to-r from-violet-600 to-azul-600 text-white"
                    : "bg-azul-600 text-white",
                className,
            )}
            title={ehPro ? "OpinioPro" : "OpinioTop"}
        >
            {ehPro ? "PRO" : "TOP"}
        </span>
    );
}
