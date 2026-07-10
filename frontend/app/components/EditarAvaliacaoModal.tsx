"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Star } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

type EditarAvaliacaoModalProps = {
    open: boolean;
    onClose: () => void;
    avaliacaoId: number;
    notaInicial: number;
    textoInicial: string;
    onSalvo: (dados: { nota: number; texto: string }) => void;
};

export default function EditarAvaliacaoModal({
    open,
    onClose,
    avaliacaoId,
    notaInicial,
    textoInicial,
    onSalvo,
}: EditarAvaliacaoModalProps) {
    const [nota, setNota] = useState(notaInicial);
    const [notaHover, setNotaHover] = useState(0);
    const [texto, setTexto] = useState(textoInicial);
    const [enviando, setEnviando] = useState(false);
    const [erro, setErro] = useState("");

    useEffect(() => {
        if (open) {
            setNota(notaInicial);
            setTexto(textoInicial);
            setErro("");
        }
    }, [open, notaInicial, textoInicial]);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setErro("");

        const textoFinal = texto.trim();
        if (nota < 1 || nota > 5) {
            setErro("Selecione uma nota de 1 a 5.");
            return;
        }
        if (!textoFinal) {
            setErro("O texto da avaliação é obrigatório.");
            return;
        }

        setEnviando(true);
        try {
            const res = await fetch(`/api/avaliacoes/${avaliacaoId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nota, texto: textoFinal }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => null);
                setErro(data?.erro || "Não foi possível salvar as alterações.");
                return;
            }

            onSalvo({ nota, texto: textoFinal });
            onClose();
        } catch {
            setErro("Não foi possível salvar as alterações.");
        } finally {
            setEnviando(false);
        }
    }

    const notaExibida = notaHover || nota;

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="gap-4 sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="font-gabarito-bold text-xl text-azul-900">Editar avaliação</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div>
                        <p className="mb-2 font-gabarito-bold text-sm text-azul-900">Sua nota</p>
                        <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((valor) => (
                                <button
                                    key={valor}
                                    type="button"
                                    onMouseEnter={() => setNotaHover(valor)}
                                    onMouseLeave={() => setNotaHover(0)}
                                    onClick={() => setNota(valor)}
                                    className="rounded p-0.5 transition hover:scale-110"
                                    aria-label={`Nota ${valor}`}
                                >
                                    <Star
                                        className={`h-6 w-6 ${
                                            valor <= notaExibida ? "fill-amber-400 text-amber-400" : "text-gray-300"
                                        }`}
                                    />
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label htmlFor="editar-texto-avaliacao" className="mb-2 block font-gabarito-bold text-sm text-azul-900">
                            Texto da avaliação
                        </label>
                        <textarea
                            id="editar-texto-avaliacao"
                            value={texto}
                            onChange={(e) => setTexto(e.target.value)}
                            rows={6}
                            className="w-full resize-none rounded-2xl border-2 border-cinza-400 bg-white px-4 py-3 font-gabarito-regular outline-none focus:border-azul-600"
                        />
                    </div>
                    {erro && <p className="text-center text-sm text-red-600">{erro}</p>}
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="ghost"
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
                            {enviando ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Salvando...
                                </>
                            ) : (
                                "Salvar"
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
