"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { FormEvent, useEffect, useState } from "react";

type AlterarNickModalProps = {
    open: boolean;
    onClose: () => void;
    nickAtual: string;
    nome: string;
    email: string;
    image?: string;
    onSalvo: (novoNick: string) => void;
};

const inputClassName =
    "w-full px-4 py-2 border-2 border-[#515151] rounded-full outline-none focus:border-azul-600 font-gabarito-regular bg-white";

export default function AlterarNickModal({
    open,
    onClose,
    nickAtual,
    nome,
    email,
    image,
    onSalvo,
}: AlterarNickModalProps) {
    const { update } = useSession();
    const [nick, setNick] = useState(nickAtual);
    const [erro, setErro] = useState("");
    const [salvando, setSalvando] = useState(false);

    useEffect(() => {
        if (open) {
            setNick(nickAtual);
            setErro("");
        }
    }, [open, nickAtual]);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if (salvando) return;

        const nickLimpo = nick.trim();
        if (!nickLimpo) {
            setErro("O nick é obrigatório.");
            return;
        }
        if (nickLimpo === nickAtual) {
            onClose();
            return;
        }

        setSalvando(true);
        setErro("");

        try {
            const res = await fetch(`/api/usuarios/${encodeURIComponent(nickAtual)}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    nome,
                    nick: nickLimpo,
                    email,
                    image: image ?? "",
                }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                setErro((data as { erro?: string }).erro || "Não foi possível alterar o nick.");
                return;
            }

            await update({ nick: nickLimpo });
            onSalvo(nickLimpo);
            onClose();
        } finally {
            setSalvando(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={value => !value && onClose()}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle className="font-gabarito-bold text-xl text-azul-900">Alterar nick</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div>
                        <label htmlFor="alterar-nick" className="mb-1 block font-gabarito-bold text-sm text-azul-900">
                            Novo @nick
                        </label>
                        <input
                            id="alterar-nick"
                            type="text"
                            value={nick}
                            onChange={e => setNick(e.target.value)}
                            required
                            className={inputClassName}
                            autoFocus
                        />
                    </div>
                    {erro && <p className="text-center font-gabarito-regular text-sm text-red-600">{erro}</p>}
                    <Button
                        type="submit"
                        disabled={salvando}
                        className="h-auto rounded-full bg-azul-600 px-6 py-2.5 font-gabarito-bold hover:bg-azul-700"
                    >
                        {salvando ? (
                            <>
                                <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                                Salvando...
                            </>
                        ) : (
                            "Salvar nick"
                        )}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
