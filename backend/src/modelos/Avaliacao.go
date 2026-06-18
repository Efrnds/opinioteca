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
	ScoreSentimento *float64  `json:"score_sentimento,omitempty"`
	CriadoEm        time.Time `json:"criado_em"`
}

type CriarAvaliacaoRequest struct {
	LivroID        *uint64 `json:"livro_id"`
	GoogleVolumeID string  `json:"google_volume_id"`
	Nota           int     `json:"nota"`
	Texto          string  `json:"texto"`
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
	ID    uint64 `json:"id"`
	Nome  string `json:"nome"`
	Nick  string `json:"nick"`
	Image string `json:"image,omitempty"`
}

type LivroFeed struct {
	ID      uint64 `json:"id"`
	Titulo  string `json:"titulo"`
	Autor   string `json:"autor"`
	CapaURL string `json:"capa_url,omitempty"`
}

type AvaliacaoFeed struct {
	ID              uint64         `json:"id"`
	Nota            int            `json:"nota"`
	Texto           string         `json:"texto"`
	CriadoEm        time.Time      `json:"criado_em"`
	Usuario         UsuarioFeed    `json:"usuario"`
	Livro           LivroFeed      `json:"livro"`
	Votos           ContadoresVoto `json:"votos"`
	MeuVoto         string         `json:"meu_voto,omitempty"`
}

func (req *CriarAvaliacaoRequest) Preparar() error {
	req.GoogleVolumeID = strings.TrimSpace(req.GoogleVolumeID)
	req.Texto = strings.TrimSpace(req.Texto)

	temLivroID := req.LivroID != nil && *req.LivroID > 0
	temGoogleID := req.GoogleVolumeID != ""

	if temLivroID == temGoogleID {
		return errors.New("Informe livro_id ou google_volume_id, mas não ambos!")
	}
	if req.Nota < 1 || req.Nota > 5 {
		return errors.New("A nota deve ser entre 1 e 5!")
	}
	if req.Texto == "" {
		return errors.New("O texto da avaliação é obrigatório!")
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
	return nil
}
