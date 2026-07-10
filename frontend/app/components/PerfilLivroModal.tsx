"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { mediaUrl } from "@/lib/media";
import type { AvaliacaoFeed } from "@/types/avaliacao";
import type { DiarioRegistro } from "@/types/diario";
import type { StatusEstante } from "@/types/estante";
import { ROTULOS_STATUS_ESTANTE } from "@/types/estante";
import Image from "next/image";

export type LivroPerfilItem = {
    id: number;
    titulo: string;
    autor: string;
    capa_url?: string;
    paginas?: number;
    porcentagem: number;
    status: StatusEstante;
    temResenha: boolean;
};

type PerfilLivroModalProps = {
    open: boolean;
    onClose: () => void;
    livro: LivroPerfilItem | null;
    registros: DiarioRegistro[];
    avaliacao?: AvaliacaoFeed;
    podeAtualizarStatus?: boolean;
    atualizandoStatus?: boolean;
    onAtualizarStatus?: (status: StatusEstante) => Promise<void> | void;
    podeRemover?: boolean;
    removendo?: boolean;
    onRemover?: () => Promise<void> | void;
};

function statusClass(status: StatusEstante) {
    if (status === "lido") return "bg-green-100 text-green-700";
    if (status === "lendo") return "bg-amber-100 text-amber-700";
    return "bg-gray-200 text-cinza-700";
}

export default function PerfilLivroModal({
    open,
    onClose,
    livro,
    registros,
    avaliacao,
    podeAtualizarStatus = false,
    atualizandoStatus = false,
    onAtualizarStatus,
    podeRemover = false,
    removendo = false,
    onRemover,
}: PerfilLivroModalProps) {
    if (!livro) {
        return null;
    }

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle className="font-gabarito-bold text-2xl text-azul-900">Detalhes do livro</DialogTitle>
                </DialogHeader>

                <div className="flex gap-4 rounded-2xl bg-background p-3">
                    {mediaUrl(livro.capa_url) ? (
                        <Image
                            src={mediaUrl(livro.capa_url)!}
                            alt={livro.titulo}
                            width={96}
                            height={144}
                            className="h-36 w-24 shrink-0 rounded-lg object-cover"
                            unoptimized
                        />
                    ) : (
                        <div className="flex h-36 w-24 shrink-0 items-center justify-center rounded-lg bg-azul-200 text-3xl">📖</div>
                    )}

                    <div className="min-w-0 space-y-2">
                        <h3 className="line-clamp-2 font-gabarito-bold text-lg text-azul-900">{livro.titulo}</h3>
                        <p className="line-clamp-1 font-gabarito-regular text-sm text-cinza-700">{livro.autor}</p>
                        {livro.paginas ? (
                            <p className="font-gabarito-regular text-xs text-cinza-700">{livro.paginas} páginas</p>
                        ) : null}
                        <div className="flex items-center gap-2">
                            <span className={`rounded-full px-3 py-1 text-xs font-gabarito-bold ${statusClass(livro.status)}`}>
                                {ROTULOS_STATUS_ESTANTE[livro.status]}
                            </span>
                            <span className="font-gabarito-bold text-sm text-azul-600">
                                {Math.round(livro.porcentagem)}% concluído
                            </span>
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <h4 className="font-gabarito-bold text-base text-azul-900">Resenha</h4>
                    {avaliacao ? (
                        <div className="rounded-xl border border-gray-200 bg-white p-3">
                            <p className="font-gabarito-bold text-azul-600">
                                {"★".repeat(avaliacao.nota)}
                                {"☆".repeat(Math.max(0, 5 - avaliacao.nota))}
                            </p>
                            <p className="mt-1 line-clamp-4 whitespace-pre-wrap font-gabarito-regular text-sm text-cinza-700">
                                {avaliacao.texto}
                            </p>
                        </div>
                    ) : (
                        <p className="font-gabarito-regular text-sm text-cinza-700">Você ainda não publicou resenha desse livro.</p>
                    )}
                </div>

                {podeAtualizarStatus && (
                    <div className="space-y-2">
                        <h4 className="font-gabarito-bold text-base text-azul-900">Atualizar status</h4>
                        {avaliacao ? (
                            <p className="font-gabarito-regular text-sm text-cinza-700">
                                Como você já publicou uma resenha, este livro permanece como <strong>lido</strong>.
                            </p>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {(["quero_ler", "lendo", "lido"] as StatusEstante[]).map((status) => (
                                    <button
                                        key={status}
                                        type="button"
                                        disabled={atualizandoStatus || !onAtualizarStatus || livro.status === status}
                                        onClick={() => onAtualizarStatus?.(status)}
                                        className={`rounded-full px-3 py-1 font-gabarito-bold text-xs transition disabled:opacity-60 ${statusClass(status)} hover:opacity-90`}
                                    >
                                        {ROTULOS_STATUS_ESTANTE[status]}
                                    </button>
                                ))}
                                {atualizandoStatus && (
                                    <p className="font-gabarito-regular text-xs text-cinza-700">Atualizando status...</p>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {podeRemover && onRemover && (
                    <button
                        type="button"
                        disabled={removendo}
                        onClick={() => onRemover()}
                        className="font-gabarito-bold text-sm text-red-600 hover:text-red-700 disabled:opacity-60"
                    >
                        {removendo ? "Removendo..." : "Remover da estante"}
                    </button>
                )}

                <div className="space-y-2">
                    <h4 className="font-gabarito-bold text-base text-azul-900">Histórico de leitura</h4>
                    {registros.length === 0 ? (
                        <p className="font-gabarito-regular text-sm text-cinza-700">Sem registros de leitura para este livro.</p>
                    ) : (
                        <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
                            {registros.map((registro) => (
                                <div key={registro.id} className="rounded-xl border border-gray-200 bg-white p-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="font-gabarito-bold text-sm text-azul-900">
                                            {registro.paginas_lidas} páginas
                                        </p>
                                        <p className="font-gabarito-bold text-sm text-azul-600">
                                            {Math.round(registro.porcentagem_leitura)}%
                                        </p>
                                    </div>
                                    <p className="mt-1 font-gabarito-regular text-xs text-cinza-700">
                                        {new Date(registro.data_registro).toLocaleString("pt-BR")}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
