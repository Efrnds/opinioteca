import { toast } from "sonner";

import { hrefLivro } from "@/lib/livro-url";

export type CompartilharLivroParams = {
    titulo: string;
    autor: string;
    livroId?: number;
    volumeId?: string;
};

export function urlLivroCompartilhavel({ livroId, volumeId }: { livroId?: number; volumeId?: string }): string {
    const path = hrefLivro({ id: livroId, google_volume_id: volumeId });
    if (typeof window !== "undefined") {
        return `${window.location.origin}${path}`;
    }
    return path;
}

export function textoCompartilharLivro(titulo: string, autor: string): string {
    return `Confira ${titulo} de ${autor} na Opinioteca`;
}

export function dadosCompartilharLivro(params: CompartilharLivroParams) {
    const url = urlLivroCompartilhavel({ livroId: params.livroId, volumeId: params.volumeId });
    const text = textoCompartilharLivro(params.titulo, params.autor);
    return { url, text, titulo: params.titulo };
}

export function urlWhatsAppCompartilhar(text: string, url: string): string {
    return `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
}

export function urlTwitterCompartilhar(text: string, url: string): string {
    return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
}

export function urlFacebookCompartilhar(url: string): string {
    return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}

export function urlTelegramCompartilhar(text: string, url: string): string {
    return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
}

export function urlEmailCompartilhar(titulo: string, text: string, url: string): string {
    const subject = encodeURIComponent(`Confira "${titulo}" na Opinioteca`);
    const body = encodeURIComponent(`${text}\n\n${url}`);
    return `mailto:?subject=${subject}&body=${body}`;
}

export async function copiarLinkCompartilhar(text: string, url: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        toast.success("Link copiado!");
        return true;
    } catch {
        toast.error("Não foi possível copiar o link.");
        return false;
    }
}

export function dispositivoSuportaWebShare(): boolean {
    if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
        return false;
    }
    const ua = navigator.userAgent;
    const mobile = /Android|iPhone|iPad|iPod/i.test(ua);
    const touch =
        navigator.maxTouchPoints > 1 &&
        typeof window !== "undefined" &&
        window.matchMedia("(pointer: coarse)").matches;
    return mobile || touch;
}

export type ResultadoCompartilharNativo = "success" | "cancelled" | "unavailable";

export async function tentarCompartilharNativo(params: CompartilharLivroParams): Promise<ResultadoCompartilharNativo> {
    if (!dispositivoSuportaWebShare()) {
        return "unavailable";
    }

    const { url, text, titulo } = dadosCompartilharLivro(params);

    try {
        await navigator.share({ title: titulo, text, url });
        return "success";
    } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
            return "cancelled";
        }
        return "unavailable";
    }
}

export async function iniciarCompartilharLivro(
    params: CompartilharLivroParams,
): Promise<"modal" | "done"> {
    const resultado = await tentarCompartilharNativo(params);
    if (resultado === "unavailable") {
        return "modal";
    }
    return "done";
}
