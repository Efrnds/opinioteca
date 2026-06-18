"use client";

import { Bell, Home, LogOut, Settings, User } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import Box from "./Box";

export default function MenuEsquerdo() {
    const { data: session } = useSession();

    const nick = session?.user?.nick ?? "Usuário";

    async function handleSignOut() {
        await signOut({ callbackUrl: "/" });
    }

    return (
        <section className="flex h-full w-full flex-col gap-11 overflow-hidden">
            <Box className="flex flex-col gap-8">
                <div className="flex flex-col gap-8">
                    <h1 className="font-gabarito-bold text-4xl">Menu</h1>
                    <div className="flex flex-col gap-8">
                        <Link href="/home" className="flex items-center gap-2">
                            <Home className="h-6 w-6" />
                            <h2 className="font-gabarito-bold text-xl">Home</h2>
                        </Link>
                        <Link href="/home" className="flex items-center gap-2">
                            <Bell className="h-6 w-6" />
                            <h2 className="font-gabarito-bold text-xl">Notificações</h2>
                        </Link>
                        <Link href="/home" className="flex items-center gap-2">
                            <User className="h-6 w-6" />
                            <h2 className="font-gabarito-bold text-xl">Perfil</h2>
                        </Link>
                        <Link href="/home" className="flex items-center gap-2">
                            <Settings className="h-6 w-6" />
                            <h2 className="font-gabarito-bold text-xl">Configurações</h2>
                        </Link>
                    </div>
                </div>
                <button className="w-full bg-azul-600 text-white font-gabarito-bold text-xl py-2 rounded-full">
                    Nova Resenha
                </button>
            </Box>
            <Box className="mt-auto flex items-center justify-between gap-8 p-4">
                <div className="flex items-center gap-2 min-w-0">
                    {session?.user?.image ? (
                        <Image
                            src={session.user.image}
                            alt="Avatar"
                            width={49}
                            height={49}
                            className="rounded-full object-cover shrink-0 aspect-square"
                        />
                    ) : (
                        <div className="w-12 h-12 bg-gray-200 rounded-full font-gabarito-bold text-2xl flex items-center justify-center shrink-0">
                            {nick.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <h2 className="font-gabarito-bold text-azul-900 text-xl truncate">{nick}</h2>
                </div>
                <button onClick={handleSignOut} className="cursor-pointer hover:bg-gray-100 rounded-full p-2 transition">
                    <LogOut className="h-6 w-6 text-red-600" />
                </button>
            </Box>
        </section>
    );
}
