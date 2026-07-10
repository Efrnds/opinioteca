import { toPng } from "html-to-image";
import { toast } from "sonner";

import { WRAPPED_SHARE_BG_COLOR, WRAPPED_SHARE_GRADIENT_CSS, getWrappedShareTema } from "@/lib/wrapped-visuals";
import type { WrappedShareTemaId } from "@/lib/wrapped-visuals";

export const WRAPPED_CARD_WIDTH = 1080;
export const WRAPPED_CARD_HEIGHT = 1920;

const GRADIENT_FUNDO = WRAPPED_SHARE_GRADIENT_CSS;

export function podeCompartilharArquivo(): boolean {
    if (typeof navigator === "undefined" || !navigator.canShare) return false;
    try {
        const probe = new File([new Blob(["x"], { type: "image/png" })], "probe.png", {
            type: "image/png",
        });
        return navigator.canShare({ files: [probe] });
    } catch {
        return false;
    }
}

function dataUrlParaBlob(dataUrl: string): Promise<Blob> {
    return fetch(dataUrl).then((res) => res.blob());
}

async function aguardarRender(): Promise<void> {
    if (typeof document !== "undefined" && document.fonts?.ready) {
        await document.fonts.ready;
    }
    await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
}

export async function gerarImagemWrapped(
    elemento: HTMLElement,
    temaId?: WrappedShareTemaId,
): Promise<string> {
    await aguardarRender();

    const bgColor = temaId ? getWrappedShareTema(temaId).bgColor : WRAPPED_SHARE_BG_COLOR;

    // Do not mutate the live card (that caused a full-size flash). The source stays
    // scale(0.01) in-viewport so it still paints; style overrides apply only to the clone.
    const dataUrl = await toPng(elemento, {
        width: WRAPPED_CARD_WIDTH,
        height: WRAPPED_CARD_HEIGHT,
        pixelRatio: 1,
        cacheBust: true,
        backgroundColor: bgColor,
        style: {
            transform: "none",
            transformOrigin: "top left",
            opacity: "1",
            visibility: "visible",
            left: "0",
            top: "0",
            margin: "0",
            zIndex: "-1",
            pointerEvents: "none",
        },
    });

    if (!dataUrl || dataUrl.length < 5000) {
        throw new Error("Imagem gerada vazia");
    }

    return dataUrl;
}

export async function baixarImagemWrapped(dataUrl: string, nome = "opiniowrapped.png"): Promise<void> {
    const link = document.createElement("a");
    link.download = nome;
    link.href = dataUrl;
    link.click();
}

export async function compartilharImagemStories(
    dataUrl: string,
    titulo = "OpinioWrapped",
): Promise<"shared" | "downloaded" | "error"> {
    try {
        const blob = await dataUrlParaBlob(dataUrl);
        const file = new File([blob], "opiniowrapped.png", { type: "image/png" });

        if (podeCompartilharArquivo()) {
            await navigator.share({ files: [file], title: titulo });
            return "shared";
        }

        await baixarImagemWrapped(dataUrl);
        toast.info("Abra o Instagram e adicione aos Stories", {
            description: "A imagem foi salva no seu dispositivo.",
            duration: 6000,
        });
        return "downloaded";
    } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
            return "downloaded";
        }
        toast.error("Não foi possível compartilhar a imagem.");
        return "error";
    }
}

export { GRADIENT_FUNDO };
