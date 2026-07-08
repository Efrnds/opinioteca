package modelos

type GeneroWrapped struct {
	Nome  string `json:"nome"`
	Total int    `json:"total"`
}

type LivroWrappedDestaque struct {
	Titulo  string `json:"titulo"`
	Autor   string `json:"autor,omitempty"`
	CapaURL string `json:"capa_url,omitempty"`
}

type OpinioWrappedResposta struct {
	Disponivel                 bool                  `json:"disponivel"`
	Teaser                     bool                  `json:"teaser,omitempty"`
	PeriodoInicio              string                `json:"periodo_inicio,omitempty"`
	PeriodoFim                 string                `json:"periodo_fim,omitempty"`
	PaginasLidas               int                   `json:"paginas_lidas,omitempty"`
	PaginasRegistradas         int                   `json:"paginas_registradas,omitempty"`
	PaginasEstimadasConcluidas int                   `json:"paginas_estimadas_concluidas,omitempty"`
	LivrosFinalizados          int                   `json:"livros_finalizados,omitempty"`
	DiasComLeitura             int                   `json:"dias_com_leitura,omitempty"`
	Registros                  int                   `json:"registros,omitempty"`
	MaiorSequencia             int                   `json:"maior_sequencia,omitempty"`
	SequenciaAtual             int                   `json:"sequencia_atual,omitempty"`
	MesMaisAtivo               string                `json:"mes_mais_ativo,omitempty"`
	PaginasMesAtivo            int                   `json:"paginas_mes_ativo,omitempty"`
	GenerosFavoritos           []GeneroWrapped       `json:"generos_favoritos,omitempty"`
	GeneroFavorito             string                `json:"genero_favorito,omitempty"`
	LivroDestaque              string                `json:"livro_destaque,omitempty"`
	LivroDestaqueDetalhe       *LivroWrappedDestaque `json:"livro_destaque_detalhe,omitempty"`
}
