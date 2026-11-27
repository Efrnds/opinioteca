package repositorios

import (
	"backend/src/model/modelos"
	"database/sql"
	"fmt"
	"strconv"
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

// NovoRepositorioDeLivros: repositorio de livros nos livros.
func NovoRepositorioDeLivros(db *sql.DB) *Livros {
	return &Livros{db}
}

// Copia do SQL para livro nos livros.
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

// Copia do SQL para livro row nos livros.
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

// nullableString: string nos livros.
func nullableString(valor string) interface{} {
	if strings.TrimSpace(valor) == "" {
		return nil
	}
	return valor
}

// nullableTime: time nos livros.
func nullableTime(valor *time.Time) interface{} {
	if valor == nil {
		return nil
	}
	return *valor
}

// Cria nos livros.
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

// Busca por id nos livros.
func (repositorio Livros) BuscarPorID(ID uint64) (modelos.Livro, error) {
	linha := repositorio.db.QueryRow(
		selectLivro+" WHERE id = $1 AND status = 'ativo'", ID)
	livro, erro := repositorio.scanLivroRow(linha)
	if erro == sql.ErrNoRows {
		return modelos.Livro{}, sql.ErrNoRows
	}
	return livro, erro
}

// Busca por isbn nos livros.
func (repositorio Livros) BuscarPorISBN(ISBN string) (modelos.Livro, error) {
	linha := repositorio.db.QueryRow(
		selectLivro+" WHERE ISBN = $1 AND status = 'ativo'", ISBN)
	livro, erro := repositorio.scanLivroRow(linha)
	if erro == sql.ErrNoRows {
		return modelos.Livro{}, sql.ErrNoRows
	}
	return livro, erro
}

// Busca por google volume id nos livros.
func (repositorio Livros) BuscarPorGoogleVolumeID(volumeID string) (modelos.Livro, error) {
	linha := repositorio.db.QueryRow(
		selectLivro+" WHERE google_volume_id = $1 AND status = 'ativo'", volumeID)
	livro, erro := repositorio.scanLivroRow(linha)
	if erro == sql.ErrNoRows {
		return modelos.Livro{}, sql.ErrNoRows
	}
	return livro, erro
}

func termosBuscaLivro(q string) []string {
	vistos := map[string]struct{}{}
	var termos []string
	for _, parte := range strings.Fields(strings.TrimSpace(q)) {
		parte = strings.Trim(parte, ".,;:!?\"'()[]")
		if len([]rune(parte)) < 3 {
			continue
		}
		chave := strings.ToLower(parte)
		if _, ok := vistos[chave]; ok {
			continue
		}
		vistos[chave] = struct{}{}
		termos = append(termos, parte)
	}
	if len(termos) == 0 {
		if q = strings.TrimSpace(q); q != "" {
			termos = append(termos, q)
		}
	}
	return termos
}

func filtroTextoLivro(colunas []string, termos []string) (string, []interface{}) {
	args := make([]interface{}, 0, len(termos))
	partes := make([]string, 0, len(termos))
	for i, termo := range termos {
		placeholder := fmt.Sprintf("$%d", i+1)
		args = append(args, "%"+termo+"%")
		campos := make([]string, 0, len(colunas))
		for _, coluna := range colunas {
			campos = append(campos, fmt.Sprintf(
				"translate(lower(%s), 'áàãâäéèêëíìîïóòõôöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') ILIKE translate(lower(%s), 'áàãâäéèêëíìîïóòõôöúùûüç', 'aaaaaeeeeiiiiooooouuuuc')",
				coluna, placeholder,
			))
		}
		partes = append(partes, "("+strings.Join(campos, " OR ")+")")
	}
	return strings.Join(partes, " AND "), args
}

// Busca texto nos livros.
func (repositorio Livros) BuscarTexto(q string, limite int) ([]modelos.Livro, error) {
	if limite <= 0 {
		limite = 10
	}

	termos := termosBuscaLivro(q)
	if len(termos) == 0 {
		return []modelos.Livro{}, nil
	}
	filtro, args := filtroTextoLivro([]string{"titulo", "autor", "ISBN", "editora"}, termos)
	args = append(args, limite)
	linhas, erro := repositorio.db.Query(
		selectLivro+` WHERE status = 'ativo' AND `+filtro+`
		 ORDER BY titulo ASC
		 LIMIT $`+strconv.Itoa(len(args)),
		args...,
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
	Offset int
}

// whereBuscarTodos: buscar todos nos livros.
func (repositorio Livros) whereBuscarTodos(filtros FiltrosLivros) (string, []interface{}) {
	query := " WHERE 1=1"
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
	_ = indice
	return query, args
}

// Busca todos nos livros.
func (repositorio Livros) BuscarTodos(filtros FiltrosLivros) ([]modelos.Livro, error) {
	livros, _, erro := repositorio.BuscarTodosPaginado(filtros)
	return livros, erro
}

// Busca todos paginado nos livros.
func (repositorio Livros) BuscarTodosPaginado(filtros FiltrosLivros) ([]modelos.Livro, int, error) {
	limite := filtros.Limite
	if limite <= 0 {
		limite = 50
	}
	offset := filtros.Offset
	if offset < 0 {
		offset = 0
	}

	where, args := repositorio.whereBuscarTodos(filtros)

	var total int
	if erro := repositorio.db.QueryRow("SELECT COUNT(*) FROM livros"+where, args...).Scan(&total); erro != nil {
		return nil, 0, erro
	}

	query := selectLivro + where
	query += fmt.Sprintf(" ORDER BY criadoEm DESC LIMIT $%d OFFSET $%d", len(args)+1, len(args)+2)
	args = append(args, limite, offset)

	linhas, erro := repositorio.db.Query(query, args...)
	if erro != nil {
		return nil, 0, erro
	}
	defer linhas.Close()

	livros := make([]modelos.Livro, 0)
	for linhas.Next() {
		livro, erro := repositorio.scanLivro(linhas)
		if erro != nil {
			return nil, 0, erro
		}
		livros = append(livros, livro)
	}
	return livros, total, nil
}

// UpsertGoogle: google nos livros.
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

// Atualiza google nos livros.
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

// Atualiza nos livros.
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

// Marca como inativo nos livros.
func (repositorio Livros) Inativar(ID uint64) error {
	_, erro := repositorio.db.Exec("UPDATE livros SET status = 'inativo' WHERE id = $1", ID)
	return erro
}

// Pesquisa global nos livros.
func (repositorio Livros) PesquisarGlobal(termo string, limite int) ([]modelos.LivroPesquisa, error) {
	termos := termosBuscaLivro(termo)
	if len(termos) == 0 {
		return []modelos.LivroPesquisa{}, nil
	}
	filtro, args := filtroTextoLivro([]string{"titulo", "autor"}, termos)
	args = append(args, limite)
	linhas, erro := repositorio.db.Query(
		`SELECT id, titulo, autor, capa_url, google_volume_id, ISBN FROM livros
		 WHERE status = 'ativo' AND `+filtro+`
		 ORDER BY titulo ASC
		 LIMIT $`+strconv.Itoa(len(args)),
		args...,
	)
	if erro != nil {
		return nil, erro
	}
	defer linhas.Close()

	resultado := make([]modelos.LivroPesquisa, 0)
	for linhas.Next() {
		var l modelos.LivroPesquisa
		var capa, googleVolumeID, isbn sql.NullString
		if erro := linhas.Scan(&l.ID, &l.Titulo, &l.Autor, &capa, &googleVolumeID, &isbn); erro != nil {
			return nil, erro
		}
		if capa.Valid {
			l.CapaURL = capa.String
		}
		if googleVolumeID.Valid {
			l.GoogleVolumeID = googleVolumeID.String
		}
		if isbn.Valid {
			l.ISBN = isbn.String
		}
		resultado = append(resultado, l)
	}
	return resultado, nil
}
