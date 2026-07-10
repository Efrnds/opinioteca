export type StatusEstante = "quero_ler" | "lendo" | "lido";

export type EstanteLivro = {
    id: number;
    titulo: string;
    autor: string;
    capa_url?: string;
    paginas: number;
};

export type EstanteItem = {
    livro: EstanteLivro;
    status: StatusEstante;
    porcentagem_atual: number;
    adicionado_em: string;
    tem_avaliacao: boolean;
};

export type EstanteResposta = {
    livros: EstanteItem[];
};

export const ROTULOS_STATUS_ESTANTE: Record<StatusEstante, string> = {
    quero_ler: "Quero ler",
    lendo: "Estou lendo",
    lido: "Lido",
};
