"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MOTIVOS_DENUNCIA, type CriarDenunciaPayload, type MotivoDenuncia, type TipoEntidadeDenuncia } from "@/types/denuncia";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";

type DenunciarModalProps = {
    open: boolean;
    onClose: () => void;
    tipoEntidade: TipoEntidadeDenuncia;
    referenciaId: number;
    titulo?: string;
};

const selectClassName =
    "w-full rounded-xl border-2 border-cinza-300 bg-white px-4 py-2 font-gabarito-regular text-azul-900 outline-none focus:border-azul-600";

const textareaClassName =
    "w-full resize-none rounded-xl border-2 border-cinza-300 bg-white px-4 py-2 font-gabarito-regular text-azul-900 outline-none focus:border-azul-600";

export default function DenunciarModal({
    open,
    onClose,
    tipoEntidade,
    referenciaId,
    titulo = "Denunciar",
}: DenunciarModalProps) {
    const [motivo, setMotivo] = useState<MotivoDenuncia>("spam");
    const [descricao, setDescricao] = useState("");
    const [enviando, setEnviando] = useState(false);
    const [erro, setErro] = useState("");

    useEffect(() => {
        if (open) {
            setMotivo("spam");
            setDescricao("");
            setErro("");
        }
    }, [open]);

    async function handleSubmit(evento: FormEvent) {
        evento.preventDefault();
        setErro("");

        if (motivo === "outro" && !descricao.trim()) {
            setErro("Descreva o motivo da denúncia.");
            return;
        }

        setEnviando(true);
        try {
            const payload: CriarDenunciaPayload = {
                tipo_entidade: tipoEntidade,
                referencia_id: referenciaId,
                motivo,
            };
            if (descricao.trim()) {
                payload.descricao = descricao.trim();
            }

            const res = await fetch("/api/denuncias", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data.erro ?? "Não foi possível enviar a denúncia.");
            }

            toast.success("Denúncia recebida. Obrigado.");
            onClose();
        } catch (e) {
            setErro(e instanceof Error ? e.message : "Não foi possível enviar a denúncia.");
        } finally {
            setEnviando(false);
        }
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(isOpen) => {
                if (!isOpen) onClose();
            }}
        >
            <DialogContent className="bg-background sm:max-w-md gap-4">
                <DialogHeader className="items-center text-center gap-2">
                    <DialogTitle className="font-gabarito-bold text-2xl text-azul-900">
                        <AnimatePresence mode="wait">
                            <motion.span
                                key={titulo}
                                initial={{ opacity: 0, y: -6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 6 }}
                                transition={{ duration: 0.2 }}
                            >
                                {titulo}
                            </motion.span>
                        </AnimatePresence>
                    </DialogTitle>
                    <p className="font-gabarito-regular text-sm text-cinza-700">
                        Sua denúncia será analisada pela equipe de moderação.
                    </p>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="motivo-denuncia" className="font-gabarito-medium text-sm text-azul-900">
                            Motivo
                        </label>
                        <select
                            id="motivo-denuncia"
                            value={motivo}
                            onChange={(e) => setMotivo(e.target.value as MotivoDenuncia)}
                            className={selectClassName}
                        >
                            {MOTIVOS_DENUNCIA.map((item) => (
                                <option key={item.value} value={item.value}>
                                    {item.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="descricao-denuncia" className="font-gabarito-medium text-sm text-azul-900">
                            Descrição {motivo === "outro" ? "(obrigatória)" : "(opcional)"}
                        </label>
                        <textarea
                            id="descricao-denuncia"
                            value={descricao}
                            onChange={(e) => setDescricao(e.target.value)}
                            rows={4}
                            placeholder="Conte mais detalhes, se necessário..."
                            className={textareaClassName}
                        />
                    </div>

                    {erro && <p className="text-center font-gabarito-regular text-sm text-red-600">{erro}</p>}

                    <div className="flex gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={enviando}
                            className="flex-1 rounded-full font-gabarito-bold"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={enviando}
                            className="flex-1 rounded-full bg-azul-600 font-gabarito-bold hover:bg-azul-700"
                        >
                            {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar denúncia"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
