package repositorios

import (
	"backend/src/modelos"
	"database/sql"
)

// Categorias é a struct responsável por representar o repositório de categorias.
type Categorias struct {
	db *sql.DB
}

// NovoRepositorioDeCategorias é a função responsável por criar um novo repositório de categorias.
func NovoRepositorioDeCategorias(db *sql.DB) *Categorias {
	return &Categorias{db}
}

// Criar é a função responsável por criar uma nova categoria no banco de dados.
func (repositorio Categorias) Criar(categoria modelos.Categoria) (uint64, error) {
	var id uint64
	erro := repositorio.db.QueryRow(
		"INSERT INTO categorias (nome_categoria, ativo) VALUES ($1, $2) RETURNING id",
		categoria.NomeCategoria,
		true,
	).Scan(&id)
	if erro != nil {
		return 0, erro
	}
	return uint64(id), nil
}

// Buscar é a função responsável por buscar todas as categorias no banco de dados.
func (repositorio Categorias) Buscar() ([]modelos.Categoria, error) {
	linhas, erro := repositorio.db.Query(
		"SELECT id, nome_categoria, ativo, criadoEm FROM categorias WHERE ativo = true",
	)
	if erro != nil {
		return nil, erro
	}
	defer linhas.Close()

	var categorias []modelos.Categoria
	for linhas.Next() {
		var categoria modelos.Categoria
		if erro = linhas.Scan(
			&categoria.ID,
			&categoria.NomeCategoria,
			&categoria.Ativo,
			&categoria.CriadoEm,
		); erro != nil {
			return nil, erro
		}
		categorias = append(categorias, categoria)
	}
	return categorias, nil
}

// BuscarPorID é a função responsável por buscar uma categoria específica no banco de dados.
func (repositorio Categorias) BuscarPorID(ID uint64) (modelos.Categoria, error) {
	linha, erro := repositorio.db.Query(
		"SELECT id, nome_categoria, ativo, criadoEm FROM categorias WHERE id = $1 AND ativo = true",
		ID)
	if erro != nil {
		return modelos.Categoria{}, erro
	}
	defer linha.Close()

	var categoria modelos.Categoria
	if linha.Next() {
		if erro = linha.Scan(
			&categoria.ID,
			&categoria.NomeCategoria,
			&categoria.Ativo,
			&categoria.CriadoEm,
		); erro != nil {
			return modelos.Categoria{}, erro
		}
	}
	return categoria, nil
}

// Atualizar é a função responsável por atualizar uma categoria específica no banco de dados.
func (repositorio Categorias) Atualizar(ID uint64, categoria modelos.Categoria) error {
	statement, erro := repositorio.db.Prepare(
		"UPDATE categorias SET nome_categoria = $1, ativo = $2 WHERE id = $3",
	)
	if erro != nil {
		return erro
	}
	defer statement.Close()
	if _, erro = statement.Exec(categoria.NomeCategoria, categoria.Ativo, ID); erro != nil {
		return erro
	}
	return nil
}

// Inativar é a função responsável por inativar uma categoria específica no banco de dados.
func (repositorio Categorias) Inativar(ID uint64) error {
	statement, erro := repositorio.db.Prepare(
		"UPDATE categorias SET ativo = false WHERE id = $1",
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
