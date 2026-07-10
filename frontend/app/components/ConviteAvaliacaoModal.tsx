"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { EstanteItem } from "@/types/estante";
import { BookOpen, X } from "lucide-react";

type ConviteAvaliacaoModalProps = {
    open: boolean;
    livro: EstanteItem["livro"] | null;
    onAceitar: () => void;
    onDispensar: () => void;
};

export default function ConviteAvaliacaoModal({ open, livro, onAceitar, onDispensar }: ConviteAvaliacaoModalProps) {
    if (!livro) {
        return null;
    }

    return (
        <Dialog open={open} onOpenChange={(value) => !value && onDispensar()}>
            <DialogContent className="max-w-sm rounded-3xl sm:rounded-4xl">
                <DialogHeader>
                    <DialogTitle className="font-gabarito-bold text-xl text-azul-900">
                        Parabéns! 🎉
                    </DialogTitle>
                </DialogHeader>

                <div className="flex flex-col items-center gap-3 py-2 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-azul-100">
                        <BookOpen className="h-7 w-7 text-azul-600" />
                    </div>
                    <p className="font-gabarito-regular text-sm text-cinza-700">
                        Você terminou <strong className="text-azul-900">{livro.titulo}</strong>.
                    </p>
                    <p className="font-gabarito-bold text-base text-azul-900">
                        Quer fazer a avaliação deste livro?
                    </p>
                </div>

                <div className="flex flex-col gap-2">
                    <Button
                        type="button"
                        onClick={onAceitar}
                        className="w-full rounded-full bg-azul-600 py-5 font-gabarito-bold hover:bg-azul-700"
                    >
                        Fazer avaliação
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={onDispensar}
                        className="w-full rounded-full font-gabarito-bold text-cinza-700"
                    >
                        <X className="mr-1 h-4 w-4" />
                        Agora não
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
