import { Bell, Home, Mail, Settings, User, type LucideIcon } from "lucide-react";

export type ItemMenu = {
    href: string;
    rotulo: string;
    icone: LucideIcon;
};

export const itensMenu: ItemMenu[] = [
    { href: "/home", rotulo: "Home", icone: Home },
    { href: "/mensagens", rotulo: "Mensagens", icone: Mail },
    { href: "/notificacoes", rotulo: "Notificações", icone: Bell },
    { href: "/perfil", rotulo: "Perfil", icone: User },
    { href: "/configuracoes", rotulo: "Configurações", icone: Settings },
];

export function itemAtivo(pathname: string, href: string) {
    if (href === "/home") {
        return pathname === "/home";
    }
    return pathname === href || pathname.startsWith(`${href}/`);
}
