package modelos

import (
	"errors"
	"strings"
	"time"
)

// Livro representa a estrutura de um livro da aplicação
type Livro struct {
	ID             uint64     `json:"id"`
	ISBN           string     `json:"isbn,omitempty"`
	Titulo         string     `json:"titulo"`
	Editora        string     `json:"editora,omitempty"`
	CategoriaID    uint64     `json:"categoria_id"`
	CategoriasIDs  []uint64   `json:"categorias_ids,omitempty"`
	Status         string     `json:"status"`
	Paginas        int        `json:"paginas"`
	Autor          string     `json:"autor"`
	Sinopse        string     `json:"sinopse,omitempty"`
	CapaURL        string     `json:"capa_url,omitempty"`
	DataPublicacao *time.Time `json:"data_publicacao,omitempty"`
	GoogleVolumeID string     `json:"google_volume_id,omitempty"`
	Origem         string     `json:"origem"`
	CriadoEm       time.Time  `json:"criado_em"`
}

// LivroPublico é a struct responsável por representar um livro público da aplicação
type LivroPublico struct {
	ID             uint64     `json:"id"`
	ISBN           string     `json:"isbn,omitempty"`
	Titulo         string     `json:"titulo"`
	Editora        string     `json:"editora,omitempty"`
	CategoriaID    uint64     `json:"categoria_id"`
	Paginas        int        `json:"paginas"`
	Autor          string     `json:"autor"`
	Sinopse        string     `json:"sinopse,omitempty"`
	CapaURL        string     `json:"capa_url,omitempty"`
	DataPublicacao *time.Time `json:"data_publicacao,omitempty"`
	GoogleVolumeID string     `json:"google_volume_id,omitempty"`
	CriadoEm       time.Time  `json:"criado_em"`
}

// LivroBusca representa um item na busca unificada (local ou Google Books)
type LivroBusca struct {
	Origem         string  `json:"origem"`
	ID             *uint64 `json:"id,omitempty"`
	GoogleVolumeID string  `json:"google_volume_id,omitempty"`
	ISBN           string  `json:"isbn,omitempty"`
	Titulo         string  `json:"titulo"`
	Autor          string  `json:"autor"`
	Paginas        int     `json:"paginas"`
	Editora        string  `json:"editora,omitempty"`
	CapaURL        string  `json:"capa_url,omitempty"`
	Sinopse        string  `json:"sinopse,omitempty"`
	CategoriaID    uint64   `json:"categoria_id,omitempty"`
	CategoriasIDs  []uint64 `json:"categorias_ids,omitempty"`
}

type ResultadoBuscaLivros struct {
	Resultados []LivroBusca `json:"resultados"`
	Aviso      string       `json:"aviso,omitempty"`
}

type CriarLivroUsuarioRequest struct {
	LivroID        *uint64 `json:"livro_id"`
	GoogleVolumeID string  `json:"google_volume_id"`
	Titulo         string  `json:"titulo"`
	Autor          string  `json:"autor"`
	Paginas        int     `json:"paginas"`
	CapaURL        string  `json:"capa_url"`
	ISBN           string  `json:"isbn"`
	CategoriaID    uint64   `json:"categoria_id"`
	CategoriasIDs  []uint64 `json:"categorias_ids"`
}

func (req *CriarLivroUsuarioRequest) CategoriasResolvidas() []uint64 {
	if len(req.CategoriasIDs) > 0 {
		return deduplicarIDs(req.CategoriasIDs)
	}
	if req.CategoriaID > 0 {
		return []uint64{req.CategoriaID}
	}
	return nil
}

func (livro *Livro) CategoriasResolvidas() []uint64 {
	if len(livro.CategoriasIDs) > 0 {
		return deduplicarIDs(livro.CategoriasIDs)
	}
	if livro.CategoriaID > 0 {
		return []uint64{livro.CategoriaID}
	}
	return nil
}

func deduplicarIDs(ids []uint64) []uint64 {
	vistos := make(map[uint64]struct{}, len(ids))
	resultado := make([]uint64, 0, len(ids))
	for _, id := range ids {
		if id == 0 {
			continue
		}
		if _, ok := vistos[id]; ok {
			continue
		}
		vistos[id] = struct{}{}
		resultado = append(resultado, id)
	}
	return resultado
}

func (req *CriarLivroUsuarioRequest) Preparar() error {
	req.Titulo = strings.TrimSpace(req.Titulo)
	req.Autor = strings.TrimSpace(req.Autor)
	req.CapaURL = strings.TrimSpace(req.CapaURL)
	req.ISBN = strings.TrimSpace(req.ISBN)
	req.GoogleVolumeID = strings.TrimSpace(req.GoogleVolumeID)

	if req.Titulo == "" {
		return errors.New("O título é obrigatório.")
	}
	if req.Autor == "" {
		return errors.New("O autor é obrigatório.")
	}
	return nil
}

func (l Livro) ParaPublico() LivroPublico {
	return LivroPublico{
		ID:             l.ID,
		ISBN:           l.ISBN,
		Titulo:         l.Titulo,
		Editora:        l.Editora,
		CategoriaID:    l.CategoriaID,
		Paginas:        l.Paginas,
		Autor:          l.Autor,
		Sinopse:        l.Sinopse,
		CapaURL:        l.CapaURL,
		DataPublicacao: l.DataPublicacao,
		GoogleVolumeID: l.GoogleVolumeID,
		CriadoEm:       l.CriadoEm,
	}
}

func (l Livro) ParaBusca() LivroBusca {
	id := l.ID
	categoriasIDs := l.CategoriasIDs
	if len(categoriasIDs) == 0 && l.CategoriaID > 0 {
		categoriasIDs = []uint64{l.CategoriaID}
	}
	return LivroBusca{
		Origem:         "local",
		ID:             &id,
		GoogleVolumeID: l.GoogleVolumeID,
		ISBN:           l.ISBN,
		Titulo:         l.Titulo,
		Autor:          l.Autor,
		Paginas:        l.Paginas,
		Editora:        l.Editora,
		CapaURL:        l.CapaURL,
		Sinopse:        l.Sinopse,
		CategoriaID:    l.CategoriaID,
		CategoriasIDs:  categoriasIDs,
	}
}

// Preparar valida e formata os dados do livro antes de persistir.
func (livro *Livro) Preparar(etapa string) error {
	if erro := livro.validar(etapa); erro != nil {
		return erro
	}
	return livro.formatar()
}

func (livro *Livro) validar(etapa string) error {
	if livro.Titulo == "" {
		return errors.New("O título é obrigatório e não pode estar em branco!")
	}
	if livro.Autor == "" {
		return errors.New("O autor é obrigatório e não pode estar em branco!")
	}

	if etapa == "admin" {
		if livro.Paginas <= 0 {
			return errors.New("O número de páginas é obrigatório e deve ser maior que zero!")
		}
		if livro.ISBN == "" {
			return errors.New("O ISBN é obrigatório e não pode estar em branco!")
		}
		if livro.Editora == "" {
			return errors.New("A editora é obrigatória e não pode estar em branco!")
		}
		if len(livro.CategoriasResolvidas()) == 0 {
			return errors.New("A categoria é obrigatória e não pode estar em branco!")
		}
		if livro.Sinopse == "" {
			return errors.New("A sinopse é obrigatória e não pode estar em branco!")
		}
	}

	if etapa == "importacao" {
		if livro.GoogleVolumeID == "" && livro.ISBN == "" {
			return errors.New("É necessário ISBN ou google_volume_id para importar o livro!")
		}
	}

	if etapa == "usuario" {
		return nil
	}

	return nil
}

func (livro *Livro) formatar() error {
	livro.ISBN = strings.TrimSpace(livro.ISBN)
	livro.Titulo = strings.TrimSpace(livro.Titulo)
	livro.Editora = strings.TrimSpace(livro.Editora)
	livro.Autor = strings.TrimSpace(livro.Autor)
	livro.Sinopse = strings.TrimSpace(livro.Sinopse)
	livro.CapaURL = strings.TrimSpace(livro.CapaURL)
	livro.GoogleVolumeID = strings.TrimSpace(livro.GoogleVolumeID)
	if livro.Origem == "" {
		livro.Origem = "local"
	}
	if livro.Status == "" {
		livro.Status = "ativo"
	}
	if categorias := livro.CategoriasResolvidas(); len(categorias) > 0 {
		livro.CategoriasIDs = categorias
		livro.CategoriaID = categorias[0]
	}
	return nil
}
