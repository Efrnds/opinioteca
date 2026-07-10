import type { PlanoStatus } from "@/types/plano";
import BadgeRank from "./BadgeRank";
import BadgeTop from "./BadgeTop";

type NomeUsuarioProps = {
    nome: string;
    nick?: string;
    assinaturaId?: number | null;
    plano?: PlanoStatus;
    temPlanoTop?: boolean;
    temPlanoPro?: boolean;
    rankConfiabilidade?: number | null;
    mostrarNick?: boolean;
    className?: string;
    nomeClassName?: string;
    nickClassName?: string;
    inline?: boolean;
};

export default function NomeUsuario({
    nome,
    nick,
    assinaturaId,
    plano,
    temPlanoTop,
    temPlanoPro,
    rankConfiabilidade,
    mostrarNick = true,
    className = "",
    nomeClassName = "",
    nickClassName = "",
    inline = false,
}: NomeUsuarioProps) {
    if (inline) {
        return (
            <span className={`inline-flex flex-wrap items-center gap-1.5 ${className}`}>
                <span className={nomeClassName}>{nome}</span>
                <BadgeTop assinaturaId={assinaturaId} plano={plano} temPlanoTop={temPlanoTop} temPlanoPro={temPlanoPro} />
                <BadgeRank rank={rankConfiabilidade} compact />
                {mostrarNick && nick ? (
                    <span className={nickClassName}>
                        @{nick}
                    </span>
                ) : null}
            </span>
        );
    }

    return (
        <div className={className}>
            <p className={`flex flex-wrap items-center gap-1.5 ${nomeClassName}`}>
                <span>{nome}</span>
                <BadgeTop assinaturaId={assinaturaId} plano={plano} temPlanoTop={temPlanoTop} temPlanoPro={temPlanoPro} />
                <BadgeRank rank={rankConfiabilidade} compact />
            </p>
            {mostrarNick && nick ? (
                <p className={nickClassName}>@{nick}</p>
            ) : null}
        </div>
    );
}
