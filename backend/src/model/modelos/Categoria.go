package modelos

import (
	"errors"
	"strings"
	"time"
)

// Categoria representa a estrutura de uma categoria de livro da aplicação
type Categoria struct {
	ID uint64 `json:"id"`
	NomeCategoria string `json:"nome_categoria"`
	Ativo bool `json:"ativo"`
	CriadoEm time.Time `json:"criado_em"`
}

// Preparar é responsável por validar e formatar os dados da categoria antes de serem persistidos no banco de dados.
func (categoria *Categoria) Preparar(etapa string) error {
	if erro := categoria.validar(etapa); erro != nil {
		return erro
	}

	if erro := categoria.formatar(etapa); erro != nil {
		return erro
	}

	return nil
}

func (categoria *Categoria) validar(etapa string) error {
	if categoria.NomeCategoria == "" {
		return errors.New("O nome da categoria é obrigatório e não pode estar em branco!")
	}
	return nil
}

func (categoria *Categoria) formatar(etapa string) error {
	categoria.NomeCategoria = strings.TrimSpace(categoria.NomeCategoria)
	return nil
}