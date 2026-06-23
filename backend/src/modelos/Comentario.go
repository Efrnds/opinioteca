package modelos

import (
	"errors"
	"strings"
	"time"
)

type Comentario struct {
	ID          uint64    `json:"id"`
	UsuarioID   uint64    `json:"usuario_id"`
	AvaliacaoID uint64    `json:"avaliacao_id"`
	PaiID       *uint64   `json:"pai_id,omitempty"`
	Texto       string    `json:"texto"`
	CriadoEm    time.Time `json:"criado_em"`
}

type CriarComentarioRequest struct {
	Texto string  `json:"texto"`
	PaiID *uint64 `json:"pai_id,omitempty"`
}

type ComentarioResposta struct {
	ID          uint64      `json:"id"`
	PaiID       *uint64     `json:"pai_id,omitempty"`
	Texto       string      `json:"texto"`
	CriadoEm    time.Time   `json:"criado_em"`
	Votos       int         `json:"votos"`
	VotoUsuario string      `json:"voto_usuario,omitempty"`
	Usuario     UsuarioFeed `json:"usuario"`
}

func (req *CriarComentarioRequest) Preparar() error {
	req.Texto = strings.TrimSpace(req.Texto)
	if req.Texto == "" {
		return errors.New("O texto do comentário é obrigatório")
	}
	if len(req.Texto) > 800 {
		return errors.New("Comentário deve ter no máximo 800 caracteres")
	}
	return nil
}
