export type LivroBusca = {
    origem: string;
    id?: number;
    google_volume_id?: string;
    isbn?: string;
    titulo: string;
    autor: string;
    paginas?: number;
    editora?: string;
    capa_url?: string;
    sinopse?: string;
};

export type LivroPublico = {
    id: number;
    isbn?: string;
    titulo: string;
    editora?: string;
    categoria_id?: number;
    paginas?: number;
    autor: string;
    sinopse?: string;
    capa_url?: string;
    data_publicacao?: string;
    criado_em?: string;
};

export type BuscaLivrosResposta = {
    resultados: LivroBusca[];
    aviso?: string;
};

export type CriarLivroPayload = {
    livro_id?: number;
    google_volume_id?: string;
    titulo: string;
    autor: string;
    paginas?: number;
    capa_url?: string;
    isbn?: string;
};
