package repositorios

import (
	"backend/src/modelos"
	"database/sql"
	"fmt"
	"strings"
	"time"
)

const selectLivro = `
	SELECT id, ISBN, titulo, editora, categoria_id, status, paginas, autor, sinopse,
	       capa_url, data_publicacao, google_volume_id, origem, criadoEm
	FROM livros`

type Livros struct {
	db *sql.DB
}

func NovoRepositorioDeLivros(db *sql.DB) *Livros {
	return &Livros{db}
}

func (repositorio Livros) scanLivro(linhas *sql.Rows) (modelos.Livro, error) {
	var livro modelos.Livro
	var isbn, editora, sinopse, capaURL, googleVolumeID sql.NullString
	var dataPublicacao sql.NullTime

	erro := linhas.Scan(
		&livro.ID,
		&isbn,
		&livro.Titulo,
		&editora,
		&livro.CategoriaID,
		&livro.Status,
		&livro.Paginas,
		&livro.Autor,
		&sinopse,
		&capaURL,
		&dataPublicacao,
		&googleVolumeID,
		&livro.Origem,
		&livro.CriadoEm,
	)
	if erro != nil {
		return modelos.Livro{}, erro
	}

	if isbn.Valid {
		livro.ISBN = isbn.String
	}
	if editora.Valid {
		livro.Editora = editora.String
	}
	if sinopse.Valid {
		livro.Sinopse = sinopse.String
	}
	if capaURL.Valid {
		livro.CapaURL = capaURL.String
	}
	if dataPublicacao.Valid {
		livro.DataPublicacao = &dataPublicacao.Time
	}
	if googleVolumeID.Valid {
		livro.GoogleVolumeID = googleVolumeID.String
	}

	return livro, nil
}

func (repositorio Livros) scanLivroRow(row *sql.Row) (modelos.Livro, error) {
	var livro modelos.Livro
	var isbn, editora, sinopse, capaURL, googleVolumeID sql.NullString
	var dataPublicacao sql.NullTime

	erro := row.Scan(
		&livro.ID,
		&isbn,
		&livro.Titulo,
		&editora,
		&livro.CategoriaID,
		&livro.Status,
		&livro.Paginas,
		&livro.Autor,
		&sinopse,
		&capaURL,
		&dataPublicacao,
		&googleVolumeID,
		&livro.Origem,
		&livro.CriadoEm,
	)
	if erro != nil {
		return modelos.Livro{}, erro
	}

	if isbn.Valid {
		livro.ISBN = isbn.String
	}
	if editora.Valid {
		livro.Editora = editora.String
	}
	if sinopse.Valid {
		livro.Sinopse = sinopse.String
	}
	if capaURL.Valid {
		livro.CapaURL = capaURL.String
	}
	if dataPublicacao.Valid {
		livro.DataPublicacao = &dataPublicacao.Time
	}
	if googleVolumeID.Valid {
		livro.GoogleVolumeID = googleVolumeID.String
	}

	return livro, nil
}

func nullableString(valor string) interface{} {
	if strings.TrimSpace(valor) == "" {
		return nil
	}
	return valor
}

func nullableTime(valor *time.Time) interface{} {
	if valor == nil {
		return nil
	}
	return *valor
}

func (repositorio Livros) Criar(livro modelos.Livro) (uint64, error) {
	var id uint64
	erro := repositorio.db.QueryRow(
		`INSERT INTO livros (ISBN, titulo, editora, categoria_id, status, paginas, autor, sinopse, capa_url, data_publicacao, google_volume_id, origem)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
		nullableString(livro.ISBN),
		livro.Titulo,
		nullableString(livro.Editora),
		livro.CategoriaID,
		livro.Status,
		livro.Paginas,
		livro.Autor,
		nullableString(livro.Sinopse),
		nullableString(livro.CapaURL),
		nullableTime(livro.DataPublicacao),
		nullableString(livro.GoogleVolumeID),
		livro.Origem,
	).Scan(&id)
	if erro != nil {
		return 0, erro
	}
	return id, nil
}

func (repositorio Livros) BuscarPorID(ID uint64) (modelos.Livro, error) {
	linha := repositorio.db.QueryRow(
		selectLivro+" WHERE id = $1 AND status = 'ativo'", ID)
	livro, erro := repositorio.scanLivroRow(linha)
	if erro == sql.ErrNoRows {
		return modelos.Livro{}, sql.ErrNoRows
	}
	return livro, erro
}

func (repositorio Livros) BuscarPorISBN(ISBN string) (modelos.Livro, error) {
	linha := repositorio.db.QueryRow(
		selectLivro+" WHERE ISBN = $1 AND status = 'ativo'", ISBN)
	livro, erro := repositorio.scanLivroRow(linha)
	if erro == sql.ErrNoRows {
		return modelos.Livro{}, sql.ErrNoRows
	}
	return livro, erro
}

func (repositorio Livros) BuscarPorGoogleVolumeID(volumeID string) (modelos.Livro, error) {
	linha := repositorio.db.QueryRow(
		selectLivro+" WHERE google_volume_id = $1 AND status = 'ativo'", volumeID)
	livro, erro := repositorio.scanLivroRow(linha)
	if erro == sql.ErrNoRows {
		return modelos.Livro{}, sql.ErrNoRows
	}
	return livro, erro
}

func (repositorio Livros) BuscarTexto(q string, limite int) ([]modelos.Livro, error) {
	if limite <= 0 {
		limite = 10
	}

	padrao := "%" + strings.TrimSpace(q) + "%"
	linhas, erro := repositorio.db.Query(
		selectLivro+` WHERE status = 'ativo'
		 AND (titulo ILIKE $1 OR autor ILIKE $1 OR ISBN ILIKE $1 OR editora ILIKE $1)
		 ORDER BY titulo ASC LIMIT $2`,
		padrao, limite,
	)
	if erro != nil {
		return nil, erro
	}
	defer linhas.Close()

	livros := make([]modelos.Livro, 0)
	for linhas.Next() {
		livro, erro := repositorio.scanLivro(linhas)
		if erro != nil {
			return nil, erro
		}
		livros = append(livros, livro)
	}
	return livros, nil
}

type FiltrosLivros struct {
	Query  string
	Status string
	Origem string
	Limite int
}

func (repositorio Livros) BuscarTodos(filtros FiltrosLivros) ([]modelos.Livro, error) {
	limite := filtros.Limite
	if limite <= 0 {
		limite = 50
	}

	query := selectLivro + " WHERE 1=1"
	args := []interface{}{}
	indice := 1

	if filtros.Status != "" {
		query += fmt.Sprintf(" AND status = $%d", indice)
		args = append(args, filtros.Status)
		indice++
	}
	if filtros.Origem != "" {
		query += fmt.Sprintf(" AND origem = $%d", indice)
		args = append(args, filtros.Origem)
		indice++
	}
	if strings.TrimSpace(filtros.Query) != "" {
		padrao := "%" + strings.TrimSpace(filtros.Query) + "%"
		query += fmt.Sprintf(" AND (titulo ILIKE $%d OR autor ILIKE $%d OR ISBN ILIKE $%d OR editora ILIKE $%d)", indice, indice, indice, indice)
		args = append(args, padrao)
		indice++
	}

	query += fmt.Sprintf(" ORDER BY criadoEm DESC LIMIT $%d", indice)
	args = append(args, limite)

	linhas, erro := repositorio.db.Query(query, args...)
	if erro != nil {
		return nil, erro
	}
	defer linhas.Close()

	livros := make([]modelos.Livro, 0)
	for linhas.Next() {
		livro, erro := repositorio.scanLivro(linhas)
		if erro != nil {
			return nil, erro
		}
		livros = append(livros, livro)
	}
	return livros, nil
}

func (repositorio Livros) UpsertGoogle(livro modelos.Livro) (uint64, error) {
	if livro.ISBN != "" {
		existente, erro := repositorio.BuscarPorISBN(livro.ISBN)
		if erro == nil {
			return existente.ID, repositorio.atualizarGoogle(existente.ID, livro)
		}
		if erro != sql.ErrNoRows {
			return 0, erro
		}
	}

	if livro.GoogleVolumeID != "" {
		existente, erro := repositorio.BuscarPorGoogleVolumeID(livro.GoogleVolumeID)
		if erro == nil {
			return existente.ID, repositorio.atualizarGoogle(existente.ID, livro)
		}
		if erro != sql.ErrNoRows {
			return 0, erro
		}
	}

	return repositorio.Criar(livro)
}

func (repositorio Livros) atualizarGoogle(id uint64, livro modelos.Livro) error {
	_, erro := repositorio.db.Exec(
		`UPDATE livros SET
		 ISBN = COALESCE($1, ISBN),
		 titulo = $2,
		 editora = COALESCE($3, editora),
		 paginas = $4,
		 autor = $5,
		 sinopse = COALESCE($6, sinopse),
		 capa_url = COALESCE($7, capa_url),
		 data_publicacao = COALESCE($8, data_publicacao),
		 google_volume_id = COALESCE($9, google_volume_id),
		 origem = $10
		 WHERE id = $11`,
		nullableString(livro.ISBN),
		livro.Titulo,
		nullableString(livro.Editora),
		livro.Paginas,
		livro.Autor,
		nullableString(livro.Sinopse),
		nullableString(livro.CapaURL),
		nullableTime(livro.DataPublicacao),
		nullableString(livro.GoogleVolumeID),
		livro.Origem,
		id,
	)
	return erro
}

func (repositorio Livros) Atualizar(ID uint64, livro modelos.Livro) error {
	_, erro := repositorio.db.Exec(
		`UPDATE livros SET ISBN = $1, titulo = $2, editora = $3, categoria_id = $4, status = $5,
		 paginas = $6, autor = $7, sinopse = $8, capa_url = $9, data_publicacao = $10,
		 google_volume_id = $11, origem = $12 WHERE id = $13`,
		nullableString(livro.ISBN),
		livro.Titulo,
		nullableString(livro.Editora),
		livro.CategoriaID,
		livro.Status,
		livro.Paginas,
		livro.Autor,
		nullableString(livro.Sinopse),
		nullableString(livro.CapaURL),
		nullableTime(livro.DataPublicacao),
		nullableString(livro.GoogleVolumeID),
		livro.Origem,
		ID,
	)
	return erro
}

func (repositorio Livros) Inativar(ID uint64) error {
	_, erro := repositorio.db.Exec("UPDATE livros SET status = 'inativo' WHERE id = $1", ID)
	return erro
}
