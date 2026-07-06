import type { ReactNode } from "react";

type AdminPageHeaderProps = {
    titulo: string;
    acao?: ReactNode;
};

export default function AdminPageHeader({ titulo, acao }: AdminPageHeaderProps) {
    return (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <h1 className="font-gabarito-bold text-3xl text-azul-900">{titulo}</h1>
            {acao}
        </div>
    );
}

export function AdminNovoButton({ label, onClick }: { label: string; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="rounded-full bg-emerald-500 px-6 py-2.5 font-gabarito-bold text-sm text-white transition hover:bg-emerald-600"
        >
            {label}
        </button>
    );
}

export function AdminStatusBadge({ status }: { status: string }) {
    const ativo = status === "ativo";
    return (
        <span className={`font-gabarito-medium capitalize ${ativo ? "text-emerald-600" : "text-red-500"}`}>
            {ativo ? "Ativo" : "Inativo"}
        </span>
    );
}

export function AdminAcoes({
    onEditar,
    onApagar,
}: {
    onEditar: () => void;
    onApagar: () => void;
}) {
    return (
        <div className="flex gap-3">
            <button
                type="button"
                onClick={onEditar}
                className="font-gabarito-medium text-sm text-azul-600 hover:underline"
            >
                Editar
            </button>
            <button
                type="button"
                onClick={onApagar}
                className="font-gabarito-medium text-sm text-red-500 hover:underline"
            >
                Apagar
            </button>
        </div>
    );
}
