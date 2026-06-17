"use client";

import { Bell, Ellipsis, Home, Settings, User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import Box from "./Box";

export default function MenuEsquerdo() {
    const { data: session } = useSession();

    console.log(session);

    async function handleSignOut() {
        await signOut({ callbackUrl: "/" });
    }

    return (
        <section className="w-1/5 flex flex-col gap-11">
            <Box className="flex flex-col gap-8 flex-1">
                <div className="flex flex-col gap-8 flex-1">
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
            <Box className="flex p-4 gap-8 items-center justify-between">
                <div className="flex items-center gap-2">
                    {session?.user?.image ? (
                        <Image src={session.user.image} alt="Avatar" width={49} height={49} className="rounded-full" />
                    ) : (
                        <div className="w-12 h-12 bg-gray-200 rounded-full font-gabarito-bold text-2xl flex items-center justify-center">
                            {session?.user?.nick?.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <h2 className="font-gabarito-bold text-azul-900 text-xl">{session?.user?.nick}</h2>
                </div>
                <button type="button" onClick={handleSignOut} aria-label="Sair">
                    <Ellipsis className="h-6 w-6 text-azul-900" />
                </button>
            </Box>
        </section>
    );
}
