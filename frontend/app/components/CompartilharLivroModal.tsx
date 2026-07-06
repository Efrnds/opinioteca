"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
    copiarLinkCompartilhar,
    dadosCompartilharLivro,
    type CompartilharLivroParams,
    urlEmailCompartilhar,
    urlFacebookCompartilhar,
    urlTelegramCompartilhar,
    urlTwitterCompartilhar,
    urlWhatsAppCompartilhar,
} from "@/lib/compartilhar";
import { motion } from "framer-motion";
import { Copy, Mail, Share2 } from "lucide-react";

type CompartilharLivroModalProps = CompartilharLivroParams & {
    open: boolean;
    onClose: () => void;
};

type OpcaoCompartilhar = {
    id: string;
    label: string;
    cor: string;
    icone: React.ReactNode;
    acao: () => void | Promise<void>;
};

function IconeWhatsApp() {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6" aria-hidden>
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
    );
}

function IconeX() {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden>
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
    );
}

function IconeFacebook() {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6" aria-hidden>
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
    );
}

function IconeTelegram() {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6" aria-hidden>
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
        </svg>
    );
}

function abrirEmNovaAba(url: string) {
    window.open(url, "_blank", "noopener,noreferrer");
}

export default function CompartilharLivroModal({
    open,
    onClose,
    titulo,
    autor,
    livroId,
    volumeId,
}: CompartilharLivroModalProps) {
    const { url, text } = dadosCompartilharLivro({ titulo, autor, livroId, volumeId });

    const opcoes: OpcaoCompartilhar[] = [
        {
            id: "copiar",
            label: "Copiar link",
            cor: "bg-azul-600",
            icone: <Copy className="h-5 w-5" />,
            acao: async () => {
                await copiarLinkCompartilhar(text, url);
                onClose();
            },
        },
        {
            id: "whatsapp",
            label: "WhatsApp",
            cor: "bg-[#25D366]",
            icone: <IconeWhatsApp />,
            acao: () => {
                abrirEmNovaAba(urlWhatsAppCompartilhar(text, url));
                onClose();
            },
        },
        {
            id: "x",
            label: "X",
            cor: "bg-black",
            icone: <IconeX />,
            acao: () => {
                abrirEmNovaAba(urlTwitterCompartilhar(text, url));
                onClose();
            },
        },
        {
            id: "facebook",
            label: "Facebook",
            cor: "bg-[#1877F2]",
            icone: <IconeFacebook />,
            acao: () => {
                abrirEmNovaAba(urlFacebookCompartilhar(url));
                onClose();
            },
        },
        {
            id: "telegram",
            label: "Telegram",
            cor: "bg-[#26A5E4]",
            icone: <IconeTelegram />,
            acao: () => {
                abrirEmNovaAba(urlTelegramCompartilhar(text, url));
                onClose();
            },
        },
        {
            id: "email",
            label: "E-mail",
            cor: "bg-azul-600",
            icone: <Mail className="h-5 w-5" />,
            acao: () => {
                window.location.href = urlEmailCompartilhar(titulo, text, url);
                onClose();
            },
        },
    ];

    return (
        <Dialog
            open={open}
            onOpenChange={(isOpen) => {
                if (!isOpen) {
                    onClose();
                }
            }}
        >
            <DialogContent className="gap-5 bg-white sm:max-w-sm">
                <DialogHeader className="items-center gap-3 text-center">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 24 }}
                        className="flex h-12 w-12 items-center justify-center rounded-full bg-azul-100 text-azul-600"
                    >
                        <Share2 className="h-5 w-5" />
                    </motion.div>
                    <DialogTitle className="font-gabarito-bold text-xl text-azul-900">Compartilhar</DialogTitle>
                    <p className="line-clamp-2 font-gabarito-regular text-sm text-cinza-700">{titulo}</p>
                </DialogHeader>

                <div className="grid grid-cols-3 gap-2">
                    {opcoes.map((opcao, index) => (
                        <motion.div
                            key={opcao.id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.04 * index, duration: 0.22 }}
                        >
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => void opcao.acao()}
                                className="flex h-auto w-full flex-col items-center gap-2 rounded-2xl px-2 py-3 hover:bg-azul-50"
                            >
                                <span
                                    className={`flex h-11 w-11 items-center justify-center rounded-full text-white shadow-sm ${opcao.cor}`}
                                >
                                    {opcao.icone}
                                </span>
                                <span className="font-gabarito-bold text-[11px] leading-tight text-azul-900">
                                    {opcao.label}
                                </span>
                            </Button>
                        </motion.div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}
