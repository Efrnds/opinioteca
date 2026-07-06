"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { mediaUrl } from "@/lib/media";
import { User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export type UsuarioListaItem = {
    id: number;
    nome: string;
    nick: string;
    image?: string;
};

type ListaUsuariosModalProps = {
    open: boolean;
    onClose: () => void;
    titulo: string;
    usuarios: UsuarioListaItem[];
    vazio?: string;
};

export default function ListaUsuariosModal({ open, onClose, titulo, usuarios, vazio }: ListaUsuariosModalProps) {
    return (
        <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
            <DialogContent className="flex max-h-[85vh] w-full max-w-full flex-col gap-0 overflow-hidden rounded-3xl p-0 sm:max-h-[80vh] sm:max-w-md sm:rounded-4xl">
                <DialogHeader className="shrink-0 border-b border-cinza-100 px-4 py-4 sm:px-6">
                    <DialogTitle className="font-gabarito-bold text-2xl text-azul-900">{titulo}</DialogTitle>
                </DialogHeader>

                <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2 sm:px-4 sm:py-3">
                    {usuarios.length === 0 ? (
                        <p className="py-8 text-center font-gabarito-regular text-sm text-cinza-700">
                            {vazio ?? "Nenhum usuário encontrado."}
                        </p>
                    ) : (
                        <div className="flex flex-col divide-y divide-cinza-100">
                            {usuarios.map((usuario) => (
                                <Link
                                    key={usuario.id}
                                    href={`/perfil/${encodeURIComponent(usuario.nick)}`}
                                    onClick={onClose}
                                    className="flex items-center gap-3 rounded-xl px-2 py-3 transition hover:bg-background active:bg-background"
                                >
                                    {usuario.image ? (
                                        <Image
                                            src={mediaUrl(usuario.image)!}
                                            alt={usuario.nome}
                                            width={48}
                                            height={48}
                                            className="h-12 w-12 shrink-0 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-azul-100">
                                            <User className="h-5 w-5 text-azul-600" />
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        <p className="truncate font-gabarito-bold text-base text-azul-900">
                                            {usuario.nome}
                                        </p>
                                        <p className="truncate font-gabarito-regular text-sm text-cinza-700">
                                            @{usuario.nick}
                                        </p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
