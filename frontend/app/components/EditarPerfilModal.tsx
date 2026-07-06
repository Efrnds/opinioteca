"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { mediaUrl } from "@/lib/media";
import { enviarImagemAvatar } from "@/lib/upload";
import { Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import AvatarPicker from "./AvatarPicker";

type UsuarioEdicao = {
    nome: string;
    nick: string;
    email: string;
    image?: string;
};

type EditarPerfilModalProps = {
    open: boolean;
    onClose: () => void;
    usuario: UsuarioEdicao | null;
    onSalvo: (atualizado: { nome: string; image?: string }) => void;
};

const inputClassName =
    "w-full px-4 py-2 border-2 border-[#515151] rounded-full outline-none focus:border-azul-600 font-gabarito-regular bg-white";

export default function EditarPerfilModal({ open, onClose, usuario, onSalvo }: EditarPerfilModalProps) {
    const { update } = useSession();
    const [nome, setNome] = useState("");
    const [email, setEmail] = useState("");
    const [imagem, setImagem] = useState<File | null>(null);
    const [previewImagem, setPreviewImagem] = useState<string | null>(null);
    const [imageUrlAtual, setImageUrlAtual] = useState<string | undefined>();
    const [erro, setErro] = useState("");
    const [salvando, setSalvando] = useState(false);

    useEffect(() => {
        if (!open || !usuario) return;
        setNome(usuario.nome);
        setEmail(usuario.email);
        setImageUrlAtual(usuario.image);
        setImagem(null);
        setPreviewImagem(null);
        setErro("");
    }, [open, usuario]);

    useEffect(() => {
        return () => {
            if (previewImagem) URL.revokeObjectURL(previewImagem);
        };
    }, [previewImagem]);

    const previewExibicao = useMemo(() => {
        if (previewImagem) return previewImagem;
        if (imageUrlAtual) return mediaUrl(imageUrlAtual);
        return null;
    }, [previewImagem, imageUrlAtual]);

    function handleSelecionarImagem(arquivo: File) {
        if (previewImagem) URL.revokeObjectURL(previewImagem);
        setImagem(arquivo);
        setPreviewImagem(URL.createObjectURL(arquivo));
        setErro("");
    }

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if (!usuario || salvando) return;

        if (!nome.trim()) {
            setErro("O nome é obrigatório.");
            return;
        }

        setSalvando(true);
        setErro("");

        try {
            let novaImageUrl = imageUrlAtual ?? "";
            if (imagem) {
                novaImageUrl = await enviarImagemAvatar(imagem);
            }

            const res = await fetch(`/api/usuarios/${encodeURIComponent(usuario.nick)}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    nome: nome.trim(),
                    nick: usuario.nick,
                    email: email.trim(),
                    image: novaImageUrl,
                }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                setErro((data as { erro?: string }).erro || "Não foi possível salvar o perfil.");
                return;
            }

            const imagemFinal = mediaUrl(novaImageUrl) || undefined;
            await update({
                name: nome.trim(),
                image: imagemFinal,
            });

            onSalvo({ nome: nome.trim(), image: novaImageUrl });
            onClose();
        } catch (uploadErro) {
            setErro(uploadErro instanceof Error ? uploadErro.message : "Erro ao enviar imagem.");
        } finally {
            setSalvando(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="font-gabarito-bold text-2xl text-azul-900">Editar perfil</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <AvatarPicker
                        previewUrl={previewExibicao}
                        fallbackInicial={nome || usuario?.nick || "?"}
                        onSelecionar={handleSelecionarImagem}
                        onErro={setErro}
                    />

                    <div>
                        <label htmlFor="editar-nome" className="mb-1 block font-gabarito-bold text-sm text-azul-900">
                            Nome
                        </label>
                        <input
                            id="editar-nome"
                            type="text"
                            value={nome}
                            onChange={(e) => setNome(e.target.value)}
                            required
                            className={inputClassName}
                        />
                    </div>

                    <div>
                        <label htmlFor="editar-email" className="mb-1 block font-gabarito-bold text-sm text-azul-900">
                            Email
                        </label>
                        <input
                            id="editar-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className={inputClassName}
                        />
                    </div>

                    {erro && <p className="text-center font-gabarito-regular text-sm text-red-600">{erro}</p>}

                    <Button
                        type="submit"
                        disabled={salvando}
                        className="h-auto rounded-full bg-azul-600 px-6 py-3 font-gabarito-bold text-base hover:bg-azul-700"
                    >
                        {salvando ? (
                            <>
                                <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                                Salvando...
                            </>
                        ) : (
                            "Salvar alterações"
                        )}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
