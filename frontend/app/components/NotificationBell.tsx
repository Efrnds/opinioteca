"use client";

import { Bell } from "lucide-react";
import { useWebSocket } from "./WebSocketProvider";

export default function NotificationBell() {
    const { contagemNaoLidas } = useWebSocket();

    return (
        <div
            className="relative flex rounded-full bg-white p-2 transition hover:bg-cinza-50"
            aria-label="Notificações"
        >
            <Bell className="h-5 w-5 text-azul-900" />
            {contagemNaoLidas > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {contagemNaoLidas > 9 ? "9+" : contagemNaoLidas}
                </span>
            )}
        </div>
    );
}
