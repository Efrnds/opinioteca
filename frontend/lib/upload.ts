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

export function validarArquivoImagem(arquivo: File): string | null {
    if (!arquivo.type.startsWith("image/")) {
        return "Selecione um arquivo de imagem válido.";
    }
    if (arquivo.size > 5 * 1024 * 1024) {
        return "A imagem deve ter no máximo 5MB.";
    }
    return null;
}
