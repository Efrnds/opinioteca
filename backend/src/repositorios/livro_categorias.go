package repositorios

import (
	"backend/src/modelos"
	"fmt"
	"strings"
)

func (repositorio Livros) SubstituirCategorias(livroID uint64, categoriasIDs []uint64) error {
	tx, erro := repositorio.db.Begin()
	if erro != nil {
		return erro
	}
	defer tx.Rollback()

	if _, erro = tx.Exec("DELETE FROM livro_categorias WHERE livro_id = $1", livroID); erro != nil {
		return erro
	}

	for _, categoriaID := range categoriasIDs {
		if categoriaID == 0 {
			continue
		}
		if _, erro = tx.Exec(
			"INSERT INTO livro_categorias (livro_id, categoria_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
			livroID, categoriaID,
		); erro != nil {
			return erro
		}
	}

	return tx.Commit()
}

func (repositorio Livros) BuscarCategoriasIDs(livroID uint64) ([]uint64, error) {
	linhas, erro := repositorio.db.Query(
		"SELECT categoria_id FROM livro_categorias WHERE livro_id = $1 ORDER BY categoria_id",
		livroID,
	)
	if erro != nil {
		return nil, erro
	}
	defer linhas.Close()

	ids := make([]uint64, 0)
	for linhas.Next() {
		var id uint64
		if erro = linhas.Scan(&id); erro != nil {
			return nil, erro
		}
		ids = append(ids, id)
	}
	return ids, nil
}

func (repositorio Livros) PreencherCategorias(livros []modelos.Livro) error {
	if len(livros) == 0 {
		return nil
	}

	ids := make([]uint64, len(livros))
	for i, livro := range livros {
		ids[i] = livro.ID
	}

	placeholders := make([]string, len(ids))
	args := make([]interface{}, len(ids))
	for i, id := range ids {
		placeholders[i] = fmt.Sprintf("$%d", i+1)
		args[i] = id
	}

	query := fmt.Sprintf(
		"SELECT livro_id, categoria_id FROM livro_categorias WHERE livro_id IN (%s) ORDER BY livro_id, categoria_id",
		strings.Join(placeholders, ","),
	)

	linhas, erro := repositorio.db.Query(query, args...)
	if erro != nil {
		if strings.Contains(erro.Error(), "livro_categorias") {
			return nil
		}
		return erro
	}
	defer linhas.Close()

	porLivro := map[uint64][]uint64{}
	for linhas.Next() {
		var livroID, categoriaID uint64
		if erro = linhas.Scan(&livroID, &categoriaID); erro != nil {
			return erro
		}
		porLivro[livroID] = append(porLivro[livroID], categoriaID)
	}

	for i := range livros {
		if cats, ok := porLivro[livros[i].ID]; ok && len(cats) > 0 {
			livros[i].CategoriasIDs = cats
			if livros[i].CategoriaID == 0 {
				livros[i].CategoriaID = cats[0]
			}
		} else if livros[i].CategoriaID > 0 {
			livros[i].CategoriasIDs = []uint64{livros[i].CategoriaID}
		}
	}
	return nil
}

func (repositorio Livros) PreencherCategoriasLivro(livro *modelos.Livro) error {
	if livro == nil || livro.ID == 0 {
		return nil
	}
	copia := []modelos.Livro{*livro}
	if erro := repositorio.PreencherCategorias(copia); erro != nil {
		return erro
	}
	livro.CategoriasIDs = copia[0].CategoriasIDs
	if livro.CategoriaID == 0 && len(livro.CategoriasIDs) > 0 {
		livro.CategoriaID = livro.CategoriasIDs[0]
	}
	return nil
}
