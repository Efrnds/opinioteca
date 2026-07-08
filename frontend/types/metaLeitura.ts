export type TipoMetaLeitura = "paginas" | "livros";
export type PeriodoMetaLeitura = "mensal" | "anual";

export type MetaLeitura = {
    tipo: TipoMetaLeitura;
    periodo: PeriodoMetaLeitura;
    meta: number;
    progresso: number;
    percentual: number;
};

export type MetaLeituraResposta =
    | { disponivel: false; teaser?: boolean }
    | { disponivel: true; configurada: false }
    | { disponivel: true; configurada: true; meta: MetaLeitura };
