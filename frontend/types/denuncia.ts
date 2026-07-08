export type TipoEntidadeDenuncia = "avaliacao" | "comentario" | "usuario" | "mensagem";

export type MotivoDenuncia =
    | "spam"
    | "ofensivo"
    | "conteudo_inadequado"
    | "informacao_falsa"
    | "outro";

export type CriarDenunciaPayload = {
    tipo_entidade: TipoEntidadeDenuncia;
    referencia_id: number;
    motivo: MotivoDenuncia;
    descricao?: string;
};

export const MOTIVOS_DENUNCIA: { value: MotivoDenuncia; label: string }[] = [
    { value: "spam", label: "Spam" },
    { value: "ofensivo", label: "Ofensivo" },
    { value: "conteudo_inadequado", label: "Conteúdo inadequado" },
    { value: "informacao_falsa", label: "Informação falsa" },
    { value: "outro", label: "Outro" },
];
