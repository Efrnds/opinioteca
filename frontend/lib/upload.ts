export async function enviarImagemAvatar(arquivo: File): Promise<string> {
    const formData = new FormData();
    formData.append("imagem", arquivo);

    const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
    });

    const data = await res.json();

    if (!res.ok || !data.url) {
        throw new Error(data.erro || "Não foi possível enviar a imagem.");
    }

    return data.url as string;
}

/** Anexos de avaliação/comentário/mensagem — pasta anexos, sem gate Pro de avatar. */
export async function enviarImagemAnexo(arquivo: File): Promise<string> {
    const formData = new FormData();
    formData.append("imagem", arquivo);

    const res = await fetch("/api/upload/anexo", {
        method: "POST",
        body: formData,
    });

    const data = await res.json();

    if (!res.ok || !data.url) {
        throw new Error(data.erro || "Não foi possível enviar o anexo.");
    }

    return data.url as string;
}

export async function enviarImagemBanner(arquivo: File): Promise<string> {
    const formData = new FormData();
    formData.append("imagem", arquivo);

    const res = await fetch("/api/upload/banner", {
        method: "POST",
        body: formData,
    });

    const data = await res.json();

    if (!res.ok || !data.url) {
        throw new Error(data.erro || "Não foi possível enviar o banner.");
    }

    return data.url as string;
}

type ValidarImagemOpts = {
    permitirGif?: boolean;
};

/** GIF ou WebP animado (VP8X/ANIM) — exclusivo OpinioPro no avatar. */
export async function arquivoEhImagemAnimada(arquivo: File): Promise<boolean> {
    const nome = arquivo.name.toLowerCase();
    if (arquivo.type === "image/gif" || nome.endsWith(".gif")) return true;
    if (arquivo.type !== "image/webp" && !nome.endsWith(".webp")) return false;

    const buf = new Uint8Array(await arquivo.slice(0, 256).arrayBuffer());
    if (buf.length < 16) return false;
    const asStr = (start: number, len: number) =>
        String.fromCharCode(...buf.subarray(start, start + len));
    if (asStr(0, 4) !== "RIFF" || asStr(8, 4) !== "WEBP") return false;
    const amostra = asStr(0, buf.length);
    if (amostra.includes("ANIM") || amostra.includes("ANMF")) return true;
    if (buf.length >= 21 && asStr(12, 4) === "VP8X") {
        return (buf[20] & 0x02) !== 0;
    }
    return false;
}

export function validarArquivoImagem(arquivo: File, opts?: ValidarImagemOpts): string | null {
    if (!arquivo.type.startsWith("image/")) {
        return "Selecione um arquivo de imagem válido.";
    }
    const ehGif = arquivo.type === "image/gif" || arquivo.name.toLowerCase().endsWith(".gif");
    if (ehGif && !opts?.permitirGif) {
        return "GIF como foto de perfil é exclusivo do OpinioPro.";
    }
    if (!ehGif && !["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(arquivo.type)) {
        return "Use JPG, PNG ou WEBP. GIF requer OpinioPro.";
    }
    if (arquivo.size > 5 * 1024 * 1024) {
        return "A imagem deve ter no máximo 5MB.";
    }
    return null;
}

/** Banner de capa: landscape, JPG/PNG/WEBP, máx. 5MB (sem GIF). */
export function validarArquivoBanner(arquivo: File): string | null {
    if (!arquivo.type.startsWith("image/")) {
        return "Selecione um arquivo de imagem válido.";
    }
    const ehGif = arquivo.type === "image/gif" || arquivo.name.toLowerCase().endsWith(".gif");
    if (ehGif) {
        return "GIF não é suportado no banner. Use JPG, PNG ou WEBP.";
    }
    if (!["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(arquivo.type)) {
        return "Use JPG, PNG ou WEBP para o banner.";
    }
    if (arquivo.size > 5 * 1024 * 1024) {
        return "O banner deve ter no máximo 5MB.";
    }
    return null;
}
