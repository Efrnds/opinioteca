package repositorios

import (
	"backend/src/modelos"
	"database/sql"
)

type Estante struct {
	db *sql.DB
}

func NovoRepositorioDeEstante(db *sql.DB) *Estante {
	return &Estante{db}
}

func (repositorio Estante) schemaExiste() bool {
	var existe bool
	erro := repositorio.db.QueryRow(`
		SELECT EXISTS (
			SELECT 1 FROM information_schema.tables
			WHERE table_schema = current_schema() AND table_name = 'usuario_estante'
		)`).Scan(&existe)
	return erro == nil && existe
}

func (repositorio Estante) Listar(usuarioID uint64) ([]modelos.EstanteItem, error) {
	if !repositorio.schemaExiste() {
		return []modelos.EstanteItem{}, nil
	}

	linhas, erro := repositorio.db.Query(
		`SELECT e.livro_id, e.status, e.adicionado_em,
		        l.titulo, l.autor, COALESCE(l.capa_url, ''), l.paginas,
		        COALESCE(ult.porcentagem_leitura, 0),
		        EXISTS(
		            SELECT 1 FROM avaliacoes a
		            WHERE a.usuario_id = e.usuario_id AND a.livro_id = e.livro_id
		        )
		 FROM usuario_estante e
		 INNER JOIN livros l ON l.id = e.livro_id
		 LEFT JOIN LATERAL (
		     SELECT porcentagem_leitura
		     FROM diario_leitura
		     WHERE usuario_id = e.usuario_id AND livro_id = e.livro_id
		     ORDER BY data_registro DESC
		     LIMIT 1
		 ) ult ON true
		 WHERE e.usuario_id = $1
		 ORDER BY e.adicionado_em DESC`,
		usuarioID,
	)
	if erro != nil {
		return nil, erro
	}
	defer linhas.Close()

	itens := make([]modelos.EstanteItem, 0)
	for linhas.Next() {
		var item modelos.EstanteItem
		if erro := linhas.Scan(
			&item.Livro.ID,
			&item.Status,
			&item.AdicionadoEm,
			&item.Livro.Titulo,
			&item.Livro.Autor,
			&item.Livro.CapaURL,
			&item.Livro.Paginas,
			&item.PorcentagemAtual,
			&item.TemAvaliacao,
		); erro != nil {
			return nil, erro
		}
		if item.TemAvaliacao {
			item.Status = "lido"
			item.PorcentagemAtual = 100
		}
		itens = append(itens, item)
	}
	return itens, nil
}

func (repositorio Estante) Adicionar(usuarioID, livroID uint64, status string) error {
	if !repositorio.schemaExiste() {
		return sql.ErrNoRows
	}

	_, erro := repositorio.db.Exec(
		`INSERT INTO usuario_estante (usuario_id, livro_id, status)
		 VALUES ($1, $2, $3)
		 ON CONFLICT (usuario_id, livro_id) DO UPDATE SET status = EXCLUDED.status`,
		usuarioID, livroID, status,
	)
	return erro
}

func (repositorio Estante) AtualizarStatus(usuarioID, livroID uint64, status string) error {
	if !repositorio.schemaExiste() {
		return sql.ErrNoRows
	}

	resultado, erro := repositorio.db.Exec(
		`UPDATE usuario_estante SET status = $3 WHERE usuario_id = $1 AND livro_id = $2`,
		usuarioID, livroID, status,
	)
	if erro != nil {
		return erro
	}
	linhas, erro := resultado.RowsAffected()
	if erro != nil {
		return erro
	}
	if linhas == 0 {
		return sql.ErrNoRows
	}
	return nil
}

func (repositorio Estante) Remover(usuarioID, livroID uint64) error {
	if !repositorio.schemaExiste() {
		return sql.ErrNoRows
	}

	resultado, erro := repositorio.db.Exec(
		`DELETE FROM usuario_estante WHERE usuario_id = $1 AND livro_id = $2`,
		usuarioID, livroID,
	)
	if erro != nil {
		return erro
	}
	linhas, erro := resultado.RowsAffected()
	if erro != nil {
		return erro
	}
	if linhas == 0 {
		return sql.ErrNoRows
	}
	return nil
}

func (repositorio Estante) SincronizarAposLeitura(tx *sql.Tx, usuarioID, livroID uint64, porcentagem float64) error {
	if !repositorio.schemaExiste() {
		return nil
	}

	status := "lendo"
	if porcentagem >= 100 {
		status = "lido"
	}

	_, erro := tx.Exec(
		`INSERT INTO usuario_estante (usuario_id, livro_id, status)
		 VALUES ($1, $2, $3)
		 ON CONFLICT (usuario_id, livro_id) DO UPDATE SET status = EXCLUDED.status`,
		usuarioID, livroID, status,
	)
	return erro
}
