"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PRECOS } from "@/lib/plano";
import type { RecursoPlano } from "@/types/plano";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import Link from "next/link";

const RECURSOS: Record<RecursoPlano, { titulo: string; descricao: string; plano: "opiniopro" | "opiniotop" }> = {
    templatesAvaliacao: {
        titulo: "Templates de avaliação",
        descricao: "Seis modelos prontos em português para começar sua avaliação com estrutura e estilo.",
        plano: "opiniotop",
    },
    estatisticasLeitura: {
        titulo: "Estatísticas de leitura",
        descricao: "Páginas lidas, livros finalizados e dias com leitura no último mês.",
        plano: "opiniotop",
    },
    edicaoAvaliacoes: {
        titulo: "Editar avaliações",
        descricao: "Ajuste nota e texto depois de publicar, sem precisar apagar e reescrever.",
        plano: "opiniotop",
    },
    historicoLeitura: {
        titulo: "Histórico de leitura completo",
        descricao: "Veja todos os livros e registros, além do recorte do último mês do plano gratuito.",
        plano: "opiniotop",
    },
    modoZen: {
        titulo: "Modo Zen",
        descricao: "Leia com menos distrações: esconda streak, descobertas e atalhos sociais.",
        plano: "opiniopro",
    },
    metaLeitura: {
        titulo: "Meta de leitura",
        descricao: "Defina metas mensais ou anuais de páginas ou livros e acompanhe seu progresso.",
        plano: "opiniopro",
    },
    gifAvatar: {
        titulo: "GIF no perfil",
        descricao: "Use um GIF animado como foto de perfil e destaque sua personalidade.",
        plano: "opiniopro",
    },
    opinioWrapped: {
        titulo: "OpinioWrapped",
        descricao: "Seu ano em leitura: páginas, livros, gêneros favoritos e sequências.",
        plano: "opiniopro",
    },
    temasCustom: {
        titulo: "Tema personalizado",
        descricao: "Crie seu visual com cores de destaque, fundo, superfície, texto e hover.",
        plano: "opiniopro",
    },
};

type PlanoUpgradeModalProps = {
    open: boolean;
    onClose: () => void;
    recurso: RecursoPlano;
};

export default function PlanoUpgradeModal({ open, onClose, recurso }: PlanoUpgradeModalProps) {
    const info = RECURSOS[recurso];
    const preco = PRECOS[info.plano];

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-md overflow-hidden border-0 p-0">
                <AnimatePresence>
                    {open ? (
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 8 }}
                            className="p-6"
                        >
                            <DialogHeader>
                                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-violet-100 to-azul-100">
                                    <Sparkles className="h-6 w-6 text-violet-700" />
                                </div>
                                <DialogTitle className="font-gabarito-bold text-2xl text-azul-900">
                                    {info.titulo}
                                </DialogTitle>
                            </DialogHeader>
                            <p className="mt-2 font-gabarito-regular text-sm leading-relaxed text-cinza-700">
                                {info.descricao}
                            </p>
                            <p className="mt-4 font-gabarito-medium text-sm text-azul-900">
                                Disponível no{" "}
                                <span className={`font-gabarito-bold ${info.plano === "opiniopro" ? "text-violet-700" : "text-azul-700"}`}>
                                    {info.plano === "opiniopro" ? "OpinioPro" : "OpinioTop"}
                                </span>, a partir de{" "}
                                <span className="font-gabarito-bold">
                                    R$ {preco.mensal.toFixed(2).replace(".", ",")}/mês
                                </span>
                            </p>
                            <div className="mt-6 flex flex-wrap gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="rounded-full font-gabarito-medium"
                                    onClick={onClose}
                                >
                                    Agora não
                                </Button>
                                <Link
                                    href="/configuracoes?secao=plano"
                                    onClick={onClose}
                                    className="inline-flex h-9 items-center justify-center rounded-full bg-gradient-to-r from-violet-600 to-azul-600 px-4 font-gabarito-bold text-sm text-white hover:opacity-90"
                                >
                                    Ver planos
                                </Link>
                            </div>
                        </motion.div>
                    ) : null}
                </AnimatePresence>
            </DialogContent>
        </Dialog>
    );
}
