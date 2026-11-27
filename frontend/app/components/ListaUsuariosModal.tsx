"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Link from "next/link";
import BadgeTop from "./BadgeTop";
import BadgeRank from "./BadgeRank";
import AvatarUsuario from "./AvatarUsuario";
export type UsuarioListaItem = {
    id: number;
    nome: string;
    nick: string;
    image?: string;
    image_url?: string;
    assinaturaId?: number;
    temPlanoTop?: boolean;
    temPlanoPro?: boolean;
    rankConfiabilidade?: number;
    plano?: {
        temPlanoPro?: boolean;
        temPlanoTop?: boolean;
    };
};
type ListaUsuariosModalProps = {
    open: boolean;
    onClose: () => void;
    titulo: string;
    usuarios: UsuarioListaItem[];
    vazio?: string;
};
export default function ListaUsuariosModal({ open, onClose, titulo, usuarios, vazio }: ListaUsuariosModalProps) {
    return (<Dialog open={open} onOpenChange={(value) => !value && onClose()}>
            <DialogContent className="flex h-auto max-h-[100dvh] w-full max-w-[calc(100%-1.5rem)] flex-col gap-0 overflow-y-auto overscroll-contain rounded-3xl p-0 sm:max-h-none sm:max-w-md sm:overflow-visible sm:rounded-4xl">
                <DialogHeader className="border-b border-cinza-100 px-4 py-4 sm:px-6">
                    <DialogTitle className="font-gabarito-bold text-2xl text-azul-900">{titulo}</DialogTitle>
                </DialogHeader>

                <div className="px-2 py-2 sm:px-4 sm:py-3">
                    {usuarios.length === 0 ? (<p className="py-8 text-center font-gabarito-regular text-sm text-cinza-700">
                            {vazio ?? "Nenhum usuário encontrado."}
                        </p>) : (<div className="flex flex-col divide-y divide-cinza-100">
                            {usuarios.map((usuario) => (<Link key={usuario.id} href={`/perfil/${encodeURIComponent(usuario.nick)}`} onClick={onClose} className="flex items-center gap-3 rounded-xl px-2 py-3 transition hover:bg-background active:bg-background">
                                    <AvatarUsuario image={usuario.image || usuario.image_url} nome={usuario.nome} nick={usuario.nick} assinaturaId={usuario.assinaturaId} temPlanoPro={usuario.temPlanoPro ?? usuario.plano?.temPlanoPro} size={48} className="h-12 w-12"/>
                                    <div className="min-w-0">
                                        <p className="flex flex-wrap items-center gap-1.5 truncate font-gabarito-bold text-base text-azul-900">
                                            {usuario.nome}
                                            <BadgeTop temPlanoTop={usuario.temPlanoTop ?? usuario.plano?.temPlanoTop} temPlanoPro={usuario.temPlanoPro ?? usuario.plano?.temPlanoPro} assinaturaId={usuario.assinaturaId}/>
                                            <BadgeRank rank={usuario.rankConfiabilidade} compact/>
                                        </p>
                                        <p className="truncate font-gabarito-regular text-sm text-cinza-700">
                                            @{usuario.nick}
                                        </p>
                                    </div>
                                </Link>))}
                        </div>)}
                </div>
            </DialogContent>
        </Dialog>);
}
