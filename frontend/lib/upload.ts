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
