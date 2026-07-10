package modelos

// RespostaPaginada é o envelope padrão de listagens paginadas do admin.
type RespostaPaginada struct {
	Itens  any `json:"itens"`
	Total  int `json:"total"`
	Pagina int `json:"pagina"`
	Limite int `json:"limite"`
}

// AssinaturaStatsAdmin resume contadores do painel de assinaturas.
type AssinaturaStatsAdmin struct {
	Top         int `json:"top"`
	Pro         int `json:"pro"`
	Expirando   int `json:"expirando"`
	TotalAtivas int `json:"totalAtivas"`
}

// UsuariosAdminListagem é a resposta paginada de usuários no admin.
type UsuariosAdminListagem struct {
	Itens  []UsuarioAdmin         `json:"itens"`
	Total  int                    `json:"total"`
	Pagina int                    `json:"pagina"`
	Limite int                    `json:"limite"`
	Stats  *AssinaturaStatsAdmin  `json:"stats,omitempty"`
}
