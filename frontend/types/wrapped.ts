export type GeneroWrapped = {
    nome: string;
    total: number;
};

export type LivroWrappedDestaque = {
    titulo: string;
    autor?: string;
    capa_url?: string;
};

export type OpinioWrapped = {
    disponivel: boolean;
    teaser?: boolean;
    periodo_inicio?: string;
    periodo_fim?: string;
    paginas_lidas?: number;
    paginas_registradas?: number;
    paginas_estimadas_concluidas?: number;
    livros_finalizados?: number;
    dias_com_leitura?: number;
    registros?: number;
    maior_sequencia?: number;
    sequencia_atual?: number;
    mes_mais_ativo?: string;
    paginas_mes_ativo?: number;
    generos_favoritos?: GeneroWrapped[];
    genero_favorito?: string;
    livro_destaque?: string;
    livro_destaque_detalhe?: LivroWrappedDestaque;
};
