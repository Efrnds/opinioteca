export type DiaSemana = {
    dia: string;
    leu: boolean;
};

export type DiarioResposta = {
    sequencia_atual: number;
    semana: DiaSemana[];
};

export type DiarioLivro = {
    id: number;
    titulo: string;
    autor: string;
    capa_url?: string;
};

export type DiarioRegistro = {
    id: number;
    livro_id: number;
    paginas_lidas: number;
    porcentagem_leitura: number;
    data_registro: string;
    livro: DiarioLivro;
};

export type DiarioLivroResumo = {
    livro: DiarioLivro;
    porcentagem_atual: number;
    ultima_leitura_em: string;
    total_registros: number;
    paginas_lidas: number;
};

export type DiarioHistoricoResposta = {
    registros: DiarioRegistro[];
    livros: DiarioLivroResumo[];
};
