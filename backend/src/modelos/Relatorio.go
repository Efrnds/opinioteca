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

// ContagemRotulo é um par rótulo/total para resumos de relatório.
type ContagemRotulo struct {
	Rotulo string `json:"rotulo"`
	Total  int    `json:"total"`
}

// UsuarioRelatorioItem é uma linha do relatório geral de usuários.
type UsuarioRelatorioItem struct {
	ID           uint64     `json:"id"`
	Nome         string     `json:"nome"`
	Nick         string     `json:"nick"`
	Email        string     `json:"email"`
	Status       string     `json:"status"`
	PlanoCodigo  string     `json:"plano_codigo"`
	PlanoNome    string     `json:"plano_nome"`
	IsAdmin      bool       `json:"is_admin"`
	CriadoEm     time.Time  `json:"criadoEm"`
	ExpiraEm     *time.Time `json:"expira_em,omitempty"`
}

// RelatorioUsuariosGeral agrega contagens e listagem filtrada.
type RelatorioUsuariosGeral struct {
	Total          int                    `json:"total"`
	PorStatus      []ContagemRotulo       `json:"por_status"`
	PorPlano       []ContagemRotulo       `json:"por_plano"`
	CriadosNoPeriodo int                  `json:"criados_no_periodo"`
	Usuarios       []UsuarioRelatorioItem `json:"usuarios"`
}

// AvaliacaoRelatorioItem é uma linha do relatório de avaliações.
type AvaliacaoRelatorioItem struct {
	ID            uint64    `json:"id"`
	Nota          int       `json:"nota"`
	Texto         string    `json:"texto"`
	ContemSpoiler bool      `json:"contem_spoiler"`
	UsuarioNick   string    `json:"usuario_nick"`
	LivroTitulo   string    `json:"livro_titulo"`
	CriadoEm      time.Time `json:"criadoEm"`
}

// RelatorioAvaliacoesGeral agrega avaliações do período.
type RelatorioAvaliacoesGeral struct {
	Total         int                      `json:"total"`
	MediaNota     float64                  `json:"media_nota"`
	ComSpoiler    int                      `json:"com_spoiler"`
	PorNota       []ContagemRotulo         `json:"por_nota"`
	Avaliacoes    []AvaliacaoRelatorioItem `json:"avaliacoes"`
}

// AssinaturaRelatorioItem é uma linha do relatório de assinaturas.
type AssinaturaRelatorioItem struct {
	ID         uint64     `json:"id"`
	Nome       string     `json:"nome"`
	Nick       string     `json:"nick"`
	Email      string     `json:"email"`
	PlanoCodigo string    `json:"plano_codigo"`
	PlanoNome  string     `json:"plano_nome"`
	ExpiraEm   *time.Time `json:"expira_em,omitempty"`
	Vitalicia  bool       `json:"vitalicia"`
	Status     string     `json:"status"`
}

// RelatorioAssinaturasGeral agrega assinaturas pagas.
type RelatorioAssinaturasGeral struct {
	Total     int                        `json:"total"`
	PorPlano  []ContagemRotulo           `json:"por_plano"`
	Ativas    int                        `json:"ativas"`
	Expirando int                        `json:"expirando"`
	Expiradas int                        `json:"expiradas"`
	Itens     []AssinaturaRelatorioItem  `json:"itens"`
}

// DenunciaRelatorioItem é uma linha do relatório de denúncias.
type DenunciaRelatorioItem struct {
	ID              uint64    `json:"id"`
	TipoEntidade    string    `json:"tipo_entidade"`
	ReferenciaID    uint64    `json:"referencia_id"`
	Motivo          string    `json:"motivo"`
	Status          string    `json:"status"`
	DenuncianteNick string    `json:"denunciante_nick"`
	CriadoEm        time.Time `json:"criadoEm"`
}

// RelatorioDenunciasGeral agrega denúncias filtradas.
type RelatorioDenunciasGeral struct {
	Total     int                      `json:"total"`
	PorStatus []ContagemRotulo         `json:"por_status"`
	PorTipo   []ContagemRotulo         `json:"por_tipo"`
	Itens     []DenunciaRelatorioItem  `json:"itens"`
}
