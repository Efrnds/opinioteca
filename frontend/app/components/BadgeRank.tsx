import { cn } from "@/lib/utils";
import { ShieldCheck } from "lucide-react";

type BadgeRankProps = {
    rank?: number | null;
    /** Se false, oculta quando rank é 0/ausente. Default: true. */
    ocultarSeZero?: boolean;
    className?: string;
    compact?: boolean;
};

/** Badge do Rank de Confiabilidade (votos em avaliações: +1 upvote / −1 downvote). */
export default function BadgeRank({
    rank,
    ocultarSeZero = true,
    className = "",
    compact = false,
}: BadgeRankProps) {
    const valor = rank ?? 0;
    if (ocultarSeZero && valor <= 0) return null;

    return (
        <span
            className={cn(
                "inline-flex shrink-0 items-center gap-0.5 rounded-full border border-azul-200 bg-azul-50 font-gabarito-bold text-azul-800",
                compact ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]",
                className,
            )}
            title="Rank de confiabilidade: baseado nos votos das suas avaliações"
        >
            <ShieldCheck className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} aria-hidden />
            <span>{valor}</span>
        </span>
    );
}
