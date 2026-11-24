package modelos

import (
	"errors"
	"strings"
	"time"
)

type EstanteLivro struct {
	ID      uint64 `json:"id"`
	Titulo  string `json:"titulo"`
	Autor   string `json:"autor"`
	CapaURL string `json:"capa_url,omitempty"`
	Paginas int    `json:"paginas"`
}

type EstanteItem struct {
	Livro            EstanteLivro `json:"livro"`
	Status           string       `json:"status"`
	PorcentagemAtual float64      `json:"porcentagem_atual"`
	AdicionadoEm     time.Time    `json:"adicionado_em"`
	TemAvaliacao       bool         `json:"tem_avaliacao"`
}

type EstanteResposta struct {
	Livros []EstanteItem `json:"livros"`
}

type AdicionarEstanteRequest struct {
	LivroID uint64 `json:"livro_id"`
	Status  string `json:"status"`
}

type AtualizarEstanteRequest struct {
	Status string `json:"status"`
}

func statusEstanteValido(status string) bool {
	switch status {
	case "quero_ler", "lendo", "lido":
		return true
	default:
		return false
	}
}

func (req *AdicionarEstanteRequest) Preparar() error {
	req.Status = strings.TrimSpace(req.Status)
	if req.LivroID == 0 {
		return errors.New("livro_id é obrigatório")
	}
	if req.Status == "" {
		req.Status = "quero_ler"
	}
	if !statusEstanteValido(req.Status) {
		return errors.New("status inválido. Use quero_ler, lendo ou lido")
	}
	return nil
}

func (req *AtualizarEstanteRequest) Preparar() error {
	req.Status = strings.TrimSpace(req.Status)
	if !statusEstanteValido(req.Status) {
		return errors.New("status inválido. Use quero_ler, lendo ou lido")
	}
	return nil
}
