package modelos

type PesquisaGlobalResponse struct {
	Usuarios []UsuarioPesquisa `json:"usuarios"`
	Livros   []LivroPesquisa   `json:"livros"`
}

type UsuarioPesquisa struct {
	ID    uint64 `json:"id"`
	Nome  string `json:"nome"`
	Nick  string `json:"nick"`
	Image string `json:"image,omitempty"`
}

type LivroPesquisa struct {
	ID             uint64 `json:"id"`
	Titulo         string `json:"titulo"`
	Autor          string `json:"autor"`
	CapaURL        string `json:"capa_url,omitempty"`
	GoogleVolumeID string `json:"google_volume_id,omitempty"`
	ISBN           string `json:"isbn,omitempty"`
}
