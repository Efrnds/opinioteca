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
    historico_limitado?: boolean;
};

export type EstatisticasLeituraResposta = {
    disponivel: boolean;
    teaser?: boolean;
    mes_referencia?: string;
    paginas_lidas_mes?: number;
    livros_finalizados_mes?: number;
    dias_com_leitura_mes?: number;
    registros_mes?: number;
    total_livros_ativos?: number;
};
