package modelos

import (
	"errors"
	"strings"
	"time"
)

// Livro representa a estrutura de um livro da aplicação
type Livro struct {
	ID uint64 `json:"id"`
	ISBN string `json:"isbn"`
	Titulo string `json:"titulo"`
	Editora string `json:"editora"`
	CategoriaID uint64 `json:"categoria_id"`
	Status string `json:"status"`
	Paginas int `json:"paginas"`
	Autor string `json:"autor"`
	Sinopse string `json:"sinopse"`
	CapaURL string `json:"capa_url"`
	DataPublicacao time.Time `json:"data_publicacao"`
	CriadoEm time.Time `json:"criado_em"`
}

type LivroPublico struct {
	ID uint64 `json:"id"`
	ISBN string `json:"isbn"`
	Titulo string `json:"titulo"`
	Editora string `json:"editora"`
	CategoriaID uint64 `json:"categoria_id"`
	Paginas int `json:"paginas"`
	Autor string `json:"autor"`
	Sinopse string `json:"sinopse"`
	CapaURL string `json:"capa_url"`
	DataPublicacao time.Time `json:"data_publicacao"`
	CriadoEm time.Time `json:"criado_em"`
}

// Preparar é responsável por validar e formatar os dados do livro antes de serem persistidos no banco de dados.
func (livro *Livro) Preparar(etapa string) error {
	if erro := livro.validar(etapa); erro != nil {
		return erro
	}

	if erro := livro.formatar(etapa); erro != nil {
		return erro
	}

	return nil
}

func (livro *Livro) validar(etapa string) error {
	if livro.ISBN == "" {
		return errors.New("O ISBN é obrigatório e não pode estar em branco!")
	}
	if livro.Titulo == "" {
		return errors.New("O título é obrigatório e não pode estar em branco!")
	}
	if livro.Editora == "" {
		return errors.New("A editora é obrigatória e não pode estar em branco!")
	}
	if livro.CategoriaID == 0 {
		return errors.New("A categoria é obrigatória e não pode estar em branco!")
	}
	if livro.Paginas == 0 {
		return errors.New("O número de páginas é obrigatório e não pode estar em branco!")
	}
	if livro.Autor == "" {
		return errors.New("O autor é obrigatório e não pode estar em branco!")
	}
	if livro.Sinopse == "" {
		return errors.New("A sinopse é obrigatória e não pode estar em branco!")
	}
	return nil
}

func (livro *Livro) formatar(etapa string) error {
	livro.ISBN = strings.TrimSpace(livro.ISBN)
	livro.Titulo = strings.TrimSpace(livro.Titulo)
	livro.Editora = strings.TrimSpace(livro.Editora)
	livro.Autor = strings.TrimSpace(livro.Autor)
	livro.Sinopse = strings.TrimSpace(livro.Sinopse)
	return nil
}