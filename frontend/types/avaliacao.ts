export type ContadoresVoto = {
    upvotes: number;
    downvotes: number;
    score: number;
};

export type AvaliacaoFeed = {
    id: number;
    nota: number;
    texto: string;
    criado_em: string;
    usuario: {
        id: number;
        nome: string;
        nick: string;
        image?: string;
    };
    livro: {
        id: number;
        titulo: string;
        autor: string;
        capa_url?: string;
    };
    votos: ContadoresVoto;
    meu_voto?: string;
};
