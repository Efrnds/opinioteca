package modelos

import (
	"errors"
	"time"
)

type DiarioLeitura struct {
	ID                 uint64    `json:"id"`
	UsuarioID          uint64    `json:"usuario_id"`
	LivroID            uint64    `json:"livro_id"`
	PaginasLidas       int       `json:"paginas_lidas"`
	PorcentagemLeitura float64   `json:"porcentagem_leitura"`
	DataRegistro       time.Time `json:"data_registro"`
}

type RegistrarDiarioRequest struct {
	LivroID            uint64  `json:"livro_id"`
	PaginasLidas       int     `json:"paginas_lidas"`
	PorcentagemLeitura float64 `json:"porcentagem_leitura"`
}

type DiaSemana struct {
	Dia string `json:"dia"`
	Leu bool   `json:"leu"`
}

type DiarioResposta struct {
	SequenciaAtual int         `json:"sequencia_atual"`
	Semana         []DiaSemana `json:"semana"`
}

type DiarioHistoricoItem struct {
	ID                 uint64    `json:"id"`
	LivroID            uint64    `json:"livro_id"`
	PaginasLidas       int       `json:"paginas_lidas"`
	PorcentagemLeitura float64   `json:"porcentagem_leitura"`
	DataRegistro       time.Time `json:"data_registro"`
	Livro              LivroFeed `json:"livro"`
}

type DiarioLivroResumo struct {
	Livro            LivroFeed `json:"livro"`
	PorcentagemAtual float64   `json:"porcentagem_atual"`
	UltimaLeituraEm  time.Time `json:"ultima_leitura_em"`
	TotalRegistros   int       `json:"total_registros"`
	PaginasLidas     int       `json:"paginas_lidas"`
}

type DiarioHistoricoResposta struct {
	Registros []DiarioHistoricoItem `json:"registros"`
	Livros    []DiarioLivroResumo   `json:"livros"`
}

func (req *RegistrarDiarioRequest) Preparar() error {
	if req.LivroID == 0 {
		return errors.New("livro_id é obrigatório")
	}
	if req.PaginasLidas <= 0 {
		return errors.New("paginas_lidas deve ser maior que zero")
	}
	if req.PorcentagemLeitura < 0 || req.PorcentagemLeitura > 100 {
		return errors.New("porcentagem_leitura deve estar entre 0 e 100")
	}
	return nil
}
