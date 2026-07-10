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
