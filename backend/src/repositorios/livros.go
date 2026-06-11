package repositorios

import (
	"backend/src/modelos"
	"database/sql"
)

// Livros é a struct responsável por representar o repositório de livros.
type Livros struct {
	db *sql.DB
}

// NovoRepositorioDeLivros é a função responsável por criar um novo repositório de livros.
func NovoRepositorioDeLivros(db *sql.DB) *Livros {
	return &Livros{db}
}

// Criar é a função responsável por criar um novo livro no banco de dados.
func (repositorio Livros) Criar(livro modelos.Livro) (uint64, error) {
	var id uint64

	erro := repositorio.db.QueryRow(
		"INSERT INTO livros (ISBN, titulo, editora, categoria_id, status, paginas, autor, sinopse, capa_url, data_publicacao) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id",
		livro.ISBN,
		livro.Titulo,
		livro.Editora,
		livro.CategoriaID,
		"ativo",
		livro.Paginas,
		livro.Autor,
		livro.Sinopse,
		livro.CapaURL,
		livro.DataPublicacao,
	).Scan(&id)
	if erro != nil {
		return 0, erro
	}

	return uint64(id), nil
}

// Buscar é a função responsável por buscar todos os livros no banco de dados.
func (repositorio Livros) Buscar(ISBN string) ([]modelos.Livro, error) {
	linhas, erro := repositorio.db.Query(
		"SELECT id, ISBN, titulo, editora, categoria_id, status, paginas, autor, sinopse, capa_url, data_publicacao FROM livros WHERE ISBN = $1 AND status = 'ativo'", 
		ISBN)
	if erro != nil {
		return nil, erro
	}
	defer linhas.Close()

	livros := make([]modelos.Livro, 0)
	for linhas.Next() {
		var livro modelos.Livro
		if erro = linhas.Scan(
			&livro.ID,
			&livro.ISBN,
			&livro.Titulo,
			&livro.Editora,
			&livro.CategoriaID,
			&livro.Status,
			&livro.Paginas,
			&livro.Autor,
			&livro.Sinopse,
			&livro.CapaURL,
			&livro.DataPublicacao,
			&livro.CriadoEm,
		); erro != nil {
			return nil, erro
		}
		livros = append(livros, livro)
	}

	return livros, nil
}

// BuscarPorID é a função responsável por buscar um livro específico no banco de dados.
func (repositorio Livros) BuscarPorID(ID uint64) (modelos.Livro, error) {
	linhas, erro := repositorio.db.Query(
		"SELECT id, ISBN, titulo, editora, categoria_id, status, paginas, autor, sinopse, capa_url, data_publicacao FROM livros WHERE id = $1 AND status = 'ativo'",
		ID)
	if erro != nil {
		return modelos.Livro{}, erro
	}

	var livro modelos.Livro
	if linhas.Next() {
		if erro = linhas.Scan(
			&livro.ID,
			&livro.ISBN,
			&livro.Titulo,
			&livro.Editora,
			&livro.CategoriaID,
			&livro.Status,
			&livro.Paginas,
			&livro.Autor,
			&livro.Sinopse,
			&livro.CapaURL,
			&livro.DataPublicacao,
			&livro.CriadoEm,
		); erro != nil {
			return modelos.Livro{}, erro
		}
	}

	return livro, nil
}

// Atualizar é a função responsável por atualizar um livro específico no banco de dados.
func (repositorio Livros) Atualizar(ID uint64, livro modelos.Livro) error {
	statement, erro := repositorio.db.Prepare(
		"UPDATE livros SET ISBN = $1, titulo = $2, editora = $3, categoria_id = $4, status = $5, paginas = $6, autor = $7, sinopse = $8, capa_url = $9, data_publicacao = $10 WHERE id = $11",
	)
	if erro != nil {
		return erro
	}
	defer statement.Close()

	if _, erro = statement.Exec(
		livro.ISBN,
		livro.Titulo,
		livro.Editora,
		livro.CategoriaID,
		livro.Status,
		livro.Paginas,
		livro.Autor,
		livro.Sinopse,
		livro.CapaURL,
		livro.DataPublicacao,
		ID,
	); erro != nil {
		return erro
	}

	return nil
}

// Inativar é a função responsável por inativar um livro específico no banco de dados.
func (repositorio Livros) Inativar(ID uint64) error {
	statement, erro := repositorio.db.Prepare(
		"UPDATE livros SET status = 'inativo' WHERE id = $1",
	)
	if erro != nil {
		return erro
	}
	defer statement.Close()

	if _, erro = statement.Exec(ID); erro != nil {
		return erro
	}

	return nil
}

// BuscarPorAutor é a função responsável por buscar todos os livros de um autor específico no banco de dados.
func (repositorio Livros) BuscarPorAutor(Autor string) ([]modelos.Livro, error) {
	linhas, erro := repositorio.db.Query(
		"SELECT id, ISBN, titulo, editora, categoria_id, status, paginas, autor, sinopse, capa_url, data_publicacao FROM livros WHERE autor = $1 AND status = 'ativo'",
		Autor)
	if erro != nil {
		return nil, erro
	}
	defer linhas.Close()

	livros := make([]modelos.Livro, 0)
	for linhas.Next() {
		var livro modelos.Livro
		if erro = linhas.Scan(
			&livro.ID,
			&livro.ISBN,
			&livro.Titulo,
			&livro.Editora,
			&livro.CategoriaID,
			&livro.Status,
			&livro.Paginas,
			&livro.Autor,
			&livro.Sinopse,
			&livro.CapaURL,
			&livro.DataPublicacao,
			&livro.CriadoEm,
		); erro != nil {
			return nil, erro
		}
		livros = append(livros, livro)
	}
	return livros, nil
}

// BuscarPorCategoria é a função responsável por buscar todos os livros de uma categoria específica no banco de dados.
func (repositorio Livros) BuscarPorCategoria(CategoriaID uint64) ([]modelos.Livro, error) {
	linhas, erro := repositorio.db.Query(
		"SELECT id, ISBN, titulo, editora, categoria_id, status, paginas, autor, sinopse, capa_url, data_publicacao FROM livros WHERE categoria_id = $1 AND status = 'ativo'",
		CategoriaID)
	if erro != nil {
		return nil, erro
	}
	defer linhas.Close()

	livros := make([]modelos.Livro, 0)
	for linhas.Next() {
		var livro modelos.Livro
		if erro = linhas.Scan(
			&livro.ID,
			&livro.ISBN,
			&livro.Titulo,
			&livro.Editora,
			&livro.CategoriaID,
			&livro.Status,
			&livro.Paginas,
			&livro.Autor,
			&livro.Sinopse,
			&livro.CapaURL,
			&livro.DataPublicacao,
			&livro.CriadoEm,
		); erro != nil {
			return nil, erro
		}
		livros = append(livros, livro)
	}
	return livros, nil
}

// BuscarPorEditora é a função responsável por buscar todos os livros de uma editora específica no banco de dados.
func (repositorio Livros) BuscarPorEditora(Editora string) ([]modelos.Livro, error) {
	linhas, erro := repositorio.db.Query(
		"SELECT id, ISBN, titulo, editora, categoria_id, status, paginas, autor, sinopse, capa_url, data_publicacao FROM livros WHERE editora = $1 AND status = 'ativo'",
		Editora)
	if erro != nil {
		return nil, erro
	}
	defer linhas.Close()
	livros := make([]modelos.Livro, 0)
	for linhas.Next() {
		var livro modelos.Livro
		if erro = linhas.Scan(
			&livro.ID,
			&livro.ISBN,
			&livro.Titulo,
			&livro.Editora,
			&livro.CategoriaID,
			&livro.Status,
			&livro.Paginas,
			&livro.Autor,
			&livro.Sinopse,
			&livro.CapaURL,
			&livro.DataPublicacao,
			&livro.CriadoEm,
		); erro != nil {
			return nil, erro
		}
		livros = append(livros, livro)
	}
	return livros, nil
}

// BuscarPorTitulo é a função responsável por buscar um livro específico pelo seu título.
func (repositorio Livros) BuscarPorTitulo(Titulo string) (modelos.Livro, error) {
	linhas, erro := repositorio.db.Query(
		"SELECT id, ISBN, titulo, editora, categoria_id, status, paginas, autor, sinopse, capa_url, data_publicacao FROM livros WHERE titulo = $1 AND status = 'ativo'",
		Titulo)
	if erro != nil {
		return modelos.Livro{}, erro
	}
	defer linhas.Close()

	var livro modelos.Livro
	if linhas.Next() {
		if erro = linhas.Scan(
			&livro.ID,
			&livro.ISBN,
			&livro.Titulo,
			&livro.Editora,
			&livro.CategoriaID,
			&livro.Status,
			&livro.Paginas,
			&livro.Autor,
			&livro.Sinopse,
			&livro.CapaURL,
			&livro.DataPublicacao,
			&livro.CriadoEm,
		); erro != nil {
			return modelos.Livro{}, erro
		}
	}
	return livro, nil
}

// BuscarPorISBN é a função responsável por buscar um livro específico pelo seu ISBN.
func (repositorio Livros) BuscarPorISBN(ISBN string) (modelos.Livro, error) {
	linhas, erro := repositorio.db.Query(
		"SELECT id, ISBN, titulo, editora, categoria_id, status, paginas, autor, sinopse, capa_url, data_publicacao FROM livros WHERE ISBN = $1 AND status = 'ativo'",
		ISBN)
	if erro != nil {
		return modelos.Livro{}, erro
	}
	defer linhas.Close()

	var livro modelos.Livro
	if linhas.Next() {
		if erro = linhas.Scan(
			&livro.ID,
			&livro.ISBN,
			&livro.Titulo,
			&livro.Editora,
			&livro.CategoriaID,
			&livro.Status,
			&livro.Paginas,
			&livro.Autor,
			&livro.Sinopse,
			&livro.CapaURL,
			&livro.DataPublicacao,
			&livro.CriadoEm,
		); erro != nil {
			return modelos.Livro{}, erro
		}
	}
	return livro, nil
}