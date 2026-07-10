package modelos

import (
	"errors"
	"strings"
	"time"
)

type Avaliacao struct {
	ID              uint64    `json:"id"`
	UsuarioID       uint64    `json:"usuario_id"`
	LivroID         uint64    `json:"livro_id"`
	TemplateID      *uint64   `json:"template_id,omitempty"`
	Nota            int       `json:"nota"`
	Texto           string    `json:"texto"`
	ContemSpoiler   bool      `json:"contem_spoiler"`
	AnexoURL        *string   `json:"anexo_url,omitempty"`
	ScoreSentimento *float64  `json:"score_sentimento,omitempty"`
	CriadoEm        time.Time `json:"criado_em"`
}

type CriarAvaliacaoRequest struct {
	LivroID        *uint64 `json:"livro_id"`
	GoogleVolumeID string  `json:"google_volume_id"`
	Nota           int     `json:"nota"`
	Texto          string  `json:"texto"`
	AnexoURL       string  `json:"anexo_url"`
	ContemSpoiler  bool    `json:"contem_spoiler"`
	TemplateID     *uint64 `json:"template_id"`
}

type AtualizarAvaliacaoRequest struct {
	Nota  int    `json:"nota"`
	Texto string `json:"texto"`
}

type CriarAvaliacaoResposta struct {
	Avaliacao Avaliacao `json:"avaliacao"`
	LivroID   uint64    `json:"livro_id"`
}

type UsuarioFeed struct {
	ID                 uint64 `json:"id"`
	Nome               string `json:"nome"`
	Nick               string `json:"nick"`
	Image              string `json:"image,omitempty"`
	AssinaturaID       uint64 `json:"assinaturaId,omitempty"`
	TemPlanoTop        bool   `json:"temPlanoTop,omitempty"`
	TemPlanoPro        bool   `json:"temPlanoPro,omitempty"`
	RankConfiabilidade int    `json:"rankConfiabilidade"`
	ContaApagada       bool   `json:"contaApagada,omitempty"`
}

type LivroFeed struct {
	ID      uint64 `json:"id"`
	Titulo  string `json:"titulo"`
	Autor   string `json:"autor"`
	CapaURL string `json:"capa_url,omitempty"`
}

type AvaliacaoFeed struct {
	ID                 uint64              `json:"id"`
	Nota               int                 `json:"nota"`
	Texto              string              `json:"texto"`
	ContemSpoiler      bool                `json:"contem_spoiler"`
	AnexoURL           *string             `json:"anexo_url,omitempty"`
	CriadoEm           time.Time           `json:"criado_em"`
	Usuario            UsuarioFeed         `json:"usuario"`
	Livro              LivroFeed           `json:"livro"`
	Votos              ContadoresVoto      `json:"votos"`
	MeuVoto            string              `json:"meu_voto,omitempty"`
	ComentarioDestaque *ComentarioResposta `json:"comentario_destaque,omitempty"`
	QtdComentarios     int                 `json:"qtd_comentarios"`
}

// FeedPaginaResposta é a resposta paginada do feed (keyset / cursor).
// next_cursor é um base64url de JSON {"criadoEm":"<RFC3339Nano>","id":<uint64>}, ou null no fim.
type FeedPaginaResposta struct {
	Itens      []AvaliacaoFeed `json:"itens"`
	NextCursor *string         `json:"next_cursor"`
}

func (req *CriarAvaliacaoRequest) Preparar() error {
	req.GoogleVolumeID = strings.TrimSpace(req.GoogleVolumeID)
	req.Texto = strings.TrimSpace(req.Texto)
	req.AnexoURL = strings.TrimSpace(req.AnexoURL)

	temLivroID := req.LivroID != nil && *req.LivroID > 0
	temGoogleID := req.GoogleVolumeID != ""

	if temLivroID == temGoogleID {
		return errors.New("Informe livro_id ou google_volume_id, mas não ambos!")
	}
	if req.Nota < 1 || req.Nota > 5 {
		return errors.New("A nota deve ser entre 1 e 5!")
	}
	if req.Texto != "" && textoContemLink(req.Texto) {
		return errors.New("Links não são permitidos em avaliações")
	}
	if req.Texto == "" && req.AnexoURL == "" {
		return errors.New("Informe o texto da avaliação ou anexe uma imagem")
	}
	if erro := ValidarURLAnexo(req.AnexoURL); erro != nil {
		return erro
	}

	return nil
}

func (req *AtualizarAvaliacaoRequest) Preparar() error {
	req.Texto = strings.TrimSpace(req.Texto)
	if req.Nota < 1 || req.Nota > 5 {
		return errors.New("A nota deve ser entre 1 e 5!")
	}
	if req.Texto == "" {
		return errors.New("O texto da avaliação é obrigatório!")
	}
	if textoContemLink(req.Texto) {
		return errors.New("Links não são permitidos em avaliações")
	}
	return nil
}
