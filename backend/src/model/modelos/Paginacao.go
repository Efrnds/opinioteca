package modelos

type RespostaPaginada struct {
	Itens  any `json:"itens"`
	Total  int `json:"total"`
	Pagina int `json:"pagina"`
	Limite int `json:"limite"`
}

type AssinaturaStatsAdmin struct {
	Top         int `json:"top"`
	Pro         int `json:"pro"`
	Expirando   int `json:"expirando"`
	TotalAtivas int `json:"totalAtivas"`
}

type UsuariosAdminListagem struct {
	Itens  []UsuarioAdmin        `json:"itens"`
	Total  int                   `json:"total"`
	Pagina int                   `json:"pagina"`
	Limite int                   `json:"limite"`
	Stats  *AssinaturaStatsAdmin `json:"stats,omitempty"`
}
