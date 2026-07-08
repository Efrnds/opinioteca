export type ContadoresVoto = {
    upvotes: number;
    downvotes: number;
    score: number;
};

export type AvaliacaoFeed = {
    id: number;
    nota: number;
    texto: string;
    contem_spoiler?: boolean;
    anexo_url?: string;
    criado_em: string;
    usuario: {
        id: number;
        nome: string;
        nick: string;
        image?: string;
        assinaturaId?: number;
        temPlanoTop?: boolean;
        temPlanoPro?: boolean;
    };
    livro: {
        id: number;
        titulo: string;
        autor: string;
        capa_url?: string;
    };
    votos: ContadoresVoto;
    meu_voto?: string;
    comentario_destaque?: ComentarioAvaliacao;
    qtd_comentarios?: number;
};

export type ComentarioAvaliacao = {
    id: number;
    pai_id?: number;
    texto: string;
    anexo_url?: string;
    criado_em: string;
    votos: number;
    voto_usuario?: string;
    usuario: {
        id: number;
        nome: string;
        nick: string;
        image?: string;
        assinaturaId?: number;
        temPlanoTop?: boolean;
        temPlanoPro?: boolean;
    };
};
