package modelos

import "time"

type ComentarioRelatorioItem struct {
	ID            uint64    `json:"id"`
	Texto         string    `json:"texto"`
	CriadoEm      time.Time `json:"criadoEm"`
	UsuarioNome   string    `json:"usuario_nome"`
	UsuarioNick   string    `json:"usuario_nick"`
	LivroTitulo   string    `json:"livro_titulo"`
	CategoriaNome string    `json:"categoria_nome"`
	AvaliacaoID   uint64    `json:"avaliacao_id"`
}

type UsuarioRelatorioResumo struct {
	ID    uint64 `json:"id"`
	Nome  string `json:"nome"`
	Nick  string `json:"nick"`
	Email string `json:"email"`
	Image string `json:"image,omitempty"`
}

type SeguidoresSeguindoRelatorio struct {
	Usuario    UsuarioRelatorioResumo   `json:"usuario"`
	Seguidores []UsuarioRelatorioResumo `json:"seguidores"`
	Seguindo   []UsuarioRelatorioResumo `json:"seguindo"`
}

type HistoricoLeituraRelatorio struct {
	Usuario   UsuarioRelatorioResumo  `json:"usuario"`
	Historico []DiarioHistoricoItem   `json:"historico"`
}

func UsuarioParaRelatorioResumo(usuario Usuario) UsuarioRelatorioResumo {
	return UsuarioRelatorioResumo{
		ID:    usuario.ID,
		Nome:  usuario.Nome,
		Nick:  usuario.Nick,
		Email: usuario.Email,
		Image: usuario.Image,
	}
}
