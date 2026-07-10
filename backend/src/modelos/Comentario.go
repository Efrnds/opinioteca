package modelos

import (
	"errors"
	"regexp"
	"strings"
	"time"
)

var linkComentarioRegex = regexp.MustCompile(`(?i)(https?://|www\.)[^\s]+`)

type Comentario struct {
	ID          uint64    `json:"id"`
	UsuarioID   uint64    `json:"usuario_id"`
	AvaliacaoID uint64    `json:"avaliacao_id"`
	PaiID       *uint64   `json:"pai_id,omitempty"`
	Texto       string    `json:"texto"`
	AnexoURL    *string   `json:"anexo_url,omitempty"`
	CriadoEm    time.Time `json:"criado_em"`
}

type CriarComentarioRequest struct {
	Texto    string  `json:"texto"`
	AnexoURL string  `json:"anexo_url"`
	PaiID    *uint64 `json:"pai_id,omitempty"`
}

type ComentarioResposta struct {
	ID          uint64      `json:"id"`
	PaiID       *uint64     `json:"pai_id,omitempty"`
	Texto       string      `json:"texto"`
	AnexoURL    *string     `json:"anexo_url,omitempty"`
	CriadoEm    time.Time   `json:"criado_em"`
	Votos       int         `json:"votos"`
	VotoUsuario string      `json:"voto_usuario,omitempty"`
	Usuario     UsuarioFeed `json:"usuario"`
}

func textoContemLink(texto string) bool {
	return linkComentarioRegex.MatchString(texto)
}

func (req *CriarComentarioRequest) Preparar() error {
	req.Texto = strings.TrimSpace(req.Texto)
	req.AnexoURL = strings.TrimSpace(req.AnexoURL)

	if req.Texto != "" && textoContemLink(req.Texto) {
		return errors.New("Links não são permitidos em comentários")
	}
	if req.Texto == "" && req.AnexoURL == "" {
		return errors.New("Informe um texto ou imagem no comentário")
	}
	if len(req.Texto) > 800 {
		return errors.New("Comentário deve ter no máximo 800 caracteres")
	}
	if erro := ValidarURLAnexo(req.AnexoURL); erro != nil {
		return erro
	}
	return nil
}
