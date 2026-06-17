package modelos

import (
	"errors"
	"strings"
	"time"
)

type Voto struct {
	ID          uint64    `json:"id"`
	UsuarioID   uint64    `json:"usuario_id"`
	AvaliacaoID uint64    `json:"avaliacao_id"`
	TipoVoto    string    `json:"tipo_voto"`
	CriadoEm    time.Time `json:"criado_em"`
}

type VotoRequest struct {
	TipoVoto string `json:"tipo_voto"`
}

type ContadoresVoto struct {
	Upvotes   int `json:"upvotes"`
	Downvotes int `json:"downvotes"`
	Score     int `json:"score"`
}

type AvaliacaoComVotos struct {
	Avaliacao
	Votos   ContadoresVoto `json:"votos"`
	MeuVoto string         `json:"meu_voto,omitempty"`
}

func (req *VotoRequest) Preparar() error {
	req.TipoVoto = strings.TrimSpace(strings.ToLower(req.TipoVoto))
	if req.TipoVoto != "upvote" && req.TipoVoto != "downvote" {
		return errors.New("tipo_voto deve ser 'upvote' ou 'downvote'")
	}
	return nil
}

func DeltaRank(tipoVoto string) int {
	if tipoVoto == "upvote" {
		return 1
	}
	return -1
}
