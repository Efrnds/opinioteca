package repositorios

import (
	"backend/src/modelos"
	"database/sql"
)

type Avaliacoes struct {
	db *sql.DB
}

func NovoRepositorioDeAvaliacoes(db *sql.DB) *Avaliacoes {
	return &Avaliacoes{db}
}

func (repositorio Avaliacoes) Criar(tx *sql.Tx, avaliacao modelos.Avaliacao) (uint64, error) {
	var id uint64
	erro := tx.QueryRow(
		`INSERT INTO avaliacoes (usuario_id, livro_id, template_id, nota, texto, score_sentimento)
		 VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
		avaliacao.UsuarioID,
		avaliacao.LivroID,
		avaliacao.TemplateID,
		avaliacao.Nota,
		avaliacao.Texto,
		avaliacao.ScoreSentimento,
	).Scan(&id)
	if erro != nil {
		return 0, erro
	}
	return id, nil
}

func (repositorio Avaliacoes) BuscarPorID(id uint64) (modelos.Avaliacao, error) {
	linha := repositorio.db.QueryRow(
		`SELECT id, usuario_id, livro_id, template_id, nota, texto, score_sentimento, criadoEm
		 FROM avaliacoes WHERE id = $1`, id)
	return scanAvaliacao(linha)
}

func (repositorio Avaliacoes) BuscarPorLivro(livroID uint64) ([]modelos.Avaliacao, error) {
	linhas, erro := repositorio.db.Query(
		`SELECT id, usuario_id, livro_id, template_id, nota, texto, score_sentimento, criadoEm
		 FROM avaliacoes WHERE livro_id = $1 ORDER BY criadoEm DESC`, livroID)
	if erro != nil {
		return nil, erro
	}
	defer linhas.Close()
	return scanAvaliacoes(linhas)
}

func (repositorio Avaliacoes) BuscarPorUsuario(usuarioID uint64) ([]modelos.Avaliacao, error) {
	linhas, erro := repositorio.db.Query(
		`SELECT id, usuario_id, livro_id, template_id, nota, texto, score_sentimento, criadoEm
		 FROM avaliacoes WHERE usuario_id = $1 ORDER BY criadoEm DESC`, usuarioID)
	if erro != nil {
		return nil, erro
	}
	defer linhas.Close()
	return scanAvaliacoes(linhas)
}

func (repositorio Avaliacoes) Atualizar(id, usuarioID uint64, nota int, texto string) error {
	resultado, erro := repositorio.db.Exec(
		"UPDATE avaliacoes SET nota = $1, texto = $2 WHERE id = $3 AND usuario_id = $4",
		nota, texto, id, usuarioID,
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

func (repositorio Avaliacoes) Deletar(id, usuarioID uint64) error {
	resultado, erro := repositorio.db.Exec(
		"DELETE FROM avaliacoes WHERE id = $1 AND usuario_id = $2", id, usuarioID)
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

func scanAvaliacao(linha *sql.Row) (modelos.Avaliacao, error) {
	var avaliacao modelos.Avaliacao
	var templateID sql.NullInt64
	var score sql.NullFloat64

	erro := linha.Scan(
		&avaliacao.ID,
		&avaliacao.UsuarioID,
		&avaliacao.LivroID,
		&templateID,
		&avaliacao.Nota,
		&avaliacao.Texto,
		&score,
		&avaliacao.CriadoEm,
	)
	if erro != nil {
		return modelos.Avaliacao{}, erro
	}
	if templateID.Valid {
		valor := uint64(templateID.Int64)
		avaliacao.TemplateID = &valor
	}
	if score.Valid {
		valor := score.Float64
		avaliacao.ScoreSentimento = &valor
	}
	return avaliacao, nil
}

func scanAvaliacoes(linhas *sql.Rows) ([]modelos.Avaliacao, error) {
	avaliacoes := make([]modelos.Avaliacao, 0)
	for linhas.Next() {
		var avaliacao modelos.Avaliacao
		var templateID sql.NullInt64
		var score sql.NullFloat64

		if erro := linhas.Scan(
			&avaliacao.ID,
			&avaliacao.UsuarioID,
			&avaliacao.LivroID,
			&templateID,
			&avaliacao.Nota,
			&avaliacao.Texto,
			&score,
			&avaliacao.CriadoEm,
		); erro != nil {
			return nil, erro
		}
		if templateID.Valid {
			valor := uint64(templateID.Int64)
			avaliacao.TemplateID = &valor
		}
		if score.Valid {
			valor := score.Float64
			avaliacao.ScoreSentimento = &valor
		}
		avaliacoes = append(avaliacoes, avaliacao)
	}
	return avaliacoes, nil
}
