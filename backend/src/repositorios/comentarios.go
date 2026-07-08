package repositorios

import (
	"backend/src/modelos"
	"database/sql"
)

type Comentarios struct {
	db *sql.DB
}

func NovoRepositorioDeComentarios(db *sql.DB) *Comentarios {
	return &Comentarios{db}
}

func (repositorio Comentarios) Criar(comentario modelos.Comentario) (modelos.Comentario, error) {
	var criado modelos.Comentario
	var anexo sql.NullString
	if comentario.AnexoURL != nil && *comentario.AnexoURL != "" {
		anexo = sql.NullString{String: *comentario.AnexoURL, Valid: true}
	}

	erro := repositorio.db.QueryRow(
		`INSERT INTO comentarios (usuario_id, avaliacao_id, pai_id, texto, anexo_url)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, usuario_id, avaliacao_id, pai_id, texto, anexo_url, criadoEm`,
		comentario.UsuarioID,
		comentario.AvaliacaoID,
		comentario.PaiID,
		comentario.Texto,
		anexo,
	).Scan(
		&criado.ID,
		&criado.UsuarioID,
		&criado.AvaliacaoID,
		&criado.PaiID,
		&criado.Texto,
		&anexo,
		&criado.CriadoEm,
	)
	if erro != nil {
		return modelos.Comentario{}, erro
	}
	if anexo.Valid {
		criado.AnexoURL = &anexo.String
	}
	return criado, nil
}

func (repositorio Comentarios) BuscarPorID(comentarioID uint64) (modelos.Comentario, error) {
	var comentario modelos.Comentario
	var paiID sql.NullInt64

	erro := repositorio.db.QueryRow(
		`SELECT id, usuario_id, avaliacao_id, pai_id, texto, criadoEm
		 FROM comentarios
		 WHERE id = $1`,
		comentarioID,
	).Scan(
		&comentario.ID,
		&comentario.UsuarioID,
		&comentario.AvaliacaoID,
		&paiID,
		&comentario.Texto,
		&comentario.CriadoEm,
	)
	if erro != nil {
		return modelos.Comentario{}, erro
	}

	if paiID.Valid {
		valor := uint64(paiID.Int64)
		comentario.PaiID = &valor
	}

	return comentario, nil
}

func (repositorio Comentarios) BuscarPorAvaliacao(avaliacaoID uint64, usuarioID *uint64) ([]modelos.ComentarioResposta, error) {
	var usuarioVotoID interface{} = nil
	if usuarioID != nil {
		usuarioVotoID = *usuarioID
	}

	linhas, erro := repositorio.db.Query(
		`SELECT c.id, c.pai_id, c.texto, c.anexo_url, c.criadoEm, u.id, u.nome, u.nick, COALESCE(u.image_url, ''),
		        COALESCE(v.saldo, 0) AS votos,
				COALESCE(vu.tipo_voto, '') AS voto_usuario
		 FROM comentarios c
		 INNER JOIN usuarios u ON u.id = c.usuario_id
		 LEFT JOIN (
			SELECT comentario_id,
			       SUM(CASE WHEN tipo_voto = 'upvote' THEN 1 ELSE -1 END) AS saldo
			FROM voto_comentarios
			GROUP BY comentario_id
		 ) v ON v.comentario_id = c.id
		 LEFT JOIN voto_comentarios vu ON vu.comentario_id = c.id AND vu.usuario_id = $2
		 WHERE c.avaliacao_id = $1
		 ORDER BY (c.pai_id IS NULL) DESC, COALESCE(v.saldo, 0) DESC, c.criadoEm ASC`,
		avaliacaoID,
		usuarioVotoID,
	)
	if erro != nil {
		return nil, erro
	}
	defer linhas.Close()

	comentarios := make([]modelos.ComentarioResposta, 0)
	for linhas.Next() {
		var item modelos.ComentarioResposta
		var paiID sql.NullInt64
		var anexo sql.NullString
		if erro := linhas.Scan(
			&item.ID,
			&paiID,
			&item.Texto,
			&anexo,
			&item.CriadoEm,
			&item.Usuario.ID,
			&item.Usuario.Nome,
			&item.Usuario.Nick,
			&item.Usuario.Image,
			&item.Votos,
			&item.VotoUsuario,
		); erro != nil {
			return nil, erro
		}
		if paiID.Valid {
			valor := uint64(paiID.Int64)
			item.PaiID = &valor
		}
		if anexo.Valid {
			item.AnexoURL = &anexo.String
		}
		comentarios = append(comentarios, item)
	}

	return comentarios, nil
}

func (repositorio Comentarios) VotarComentario(usuarioID, comentarioID uint64, tipoVoto string) error {
	_, erro := repositorio.db.Exec(
		`INSERT INTO voto_comentarios (usuario_id, comentario_id, tipo_voto)
		 VALUES ($1, $2, $3)
		 ON CONFLICT (usuario_id, comentario_id)
		 DO UPDATE SET tipo_voto = EXCLUDED.tipo_voto`,
		usuarioID,
		comentarioID,
		tipoVoto,
	)
	return erro
}

func (repositorio Comentarios) DeletarPorAdmin(comentarioID uint64) error {
	comentario, erro := repositorio.BuscarPorID(comentarioID)
	if erro != nil {
		return erro
	}

	tx, erro := repositorio.db.Begin()
	if erro != nil {
		return erro
	}
	defer tx.Rollback()

	if _, erro = tx.Exec(`DELETE FROM voto_comentarios WHERE comentario_id = $1`, comentarioID); erro != nil {
		return erro
	}

	resultado, erro := tx.Exec(`DELETE FROM comentarios WHERE id = $1`, comentarioID)
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

	if erro = tx.Commit(); erro != nil {
		return erro
	}

	return repositorio.AtualizarComentarioDestaqueCache(comentario.AvaliacaoID)
}

func (repositorio Comentarios) RemoverVotoComentario(usuarioID, comentarioID uint64) error {
	resultado, erro := repositorio.db.Exec(
		"DELETE FROM voto_comentarios WHERE usuario_id = $1 AND comentario_id = $2",
		usuarioID,
		comentarioID,
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

func (repositorio Comentarios) BuscarComentarioDestaque(avaliacaoID uint64) (*modelos.ComentarioResposta, error) {
	var comentario modelos.ComentarioResposta
	var paiID sql.NullInt64

	erro := repositorio.db.QueryRow(
		`SELECT c.id, c.pai_id, c.texto, c.criadoEm,
		        u.id, u.nome, u.nick, COALESCE(u.image_url, ''),
		        COALESCE(v.saldo, 0) AS votos
		 FROM comentarios c
		 INNER JOIN usuarios u ON u.id = c.usuario_id
		 LEFT JOIN (
			SELECT comentario_id,
			       SUM(CASE WHEN tipo_voto = 'upvote' THEN 1 ELSE -1 END) AS saldo
			FROM voto_comentarios
			GROUP BY comentario_id
		 ) v ON v.comentario_id = c.id
		 WHERE c.avaliacao_id = $1 AND c.pai_id IS NULL
		 ORDER BY COALESCE(v.saldo, 0) DESC, c.criadoEm ASC
		 LIMIT 1`,
		avaliacaoID,
	).Scan(
		&comentario.ID,
		&paiID,
		&comentario.Texto,
		&comentario.CriadoEm,
		&comentario.Usuario.ID,
		&comentario.Usuario.Nome,
		&comentario.Usuario.Nick,
		&comentario.Usuario.Image,
		&comentario.Votos,
	)

	if erro == sql.ErrNoRows {
		return nil, nil
	}
	if erro != nil {
		return nil, erro
	}
	if paiID.Valid {
		valor := uint64(paiID.Int64)
		comentario.PaiID = &valor
	}

	return &comentario, nil
}

func (repositorio Comentarios) BuscarDestaquesPorAvaliacoes(avaliacaoIDs []uint64) (map[uint64]*modelos.ComentarioResposta, error) {
	if len(avaliacaoIDs) == 0 {
		return map[uint64]*modelos.ComentarioResposta{}, nil
	}

	query := `SELECT cdc.avaliacao_id, c.id, c.pai_id, c.texto, c.criadoEm,
	                 u.id, u.nome, u.nick, COALESCE(u.image_url, ''), cdc.votos
	          FROM comentario_destaque_cache cdc
	          INNER JOIN comentarios c ON c.id = cdc.comentario_id
	          INNER JOIN usuarios u ON u.id = c.usuario_id
	          WHERE cdc.avaliacao_id = ANY($1)`

	linhas, erro := repositorio.db.Query(query, pqArrayUInt64(avaliacaoIDs))
	if erro != nil {
		return nil, erro
	}
	defer linhas.Close()

	resultado := make(map[uint64]*modelos.ComentarioResposta)
	for linhas.Next() {
		var avaliacaoID uint64
		var comentario modelos.ComentarioResposta
		var paiID sql.NullInt64
		if erro := linhas.Scan(
			&avaliacaoID,
			&comentario.ID,
			&paiID,
			&comentario.Texto,
			&comentario.CriadoEm,
			&comentario.Usuario.ID,
			&comentario.Usuario.Nome,
			&comentario.Usuario.Nick,
			&comentario.Usuario.Image,
			&comentario.Votos,
		); erro != nil {
			return nil, erro
		}
		if paiID.Valid {
			valor := uint64(paiID.Int64)
			comentario.PaiID = &valor
		}

		copia := comentario
		resultado[avaliacaoID] = &copia
	}

	return resultado, nil
}

func (repositorio Comentarios) AtualizarComentarioDestaqueCache(avaliacaoID uint64) error {
	var comentarioID sql.NullInt64
	var votos int

	erro := repositorio.db.QueryRow(
		`SELECT c.id,
		        COALESCE(SUM(CASE WHEN vc.tipo_voto = 'upvote' THEN 1 ELSE -1 END), 0) AS saldo
		 FROM comentarios c
		 LEFT JOIN voto_comentarios vc ON vc.comentario_id = c.id
		 WHERE c.avaliacao_id = $1 AND c.pai_id IS NULL
		 GROUP BY c.id, c.criadoEm
		 ORDER BY saldo DESC, c.criadoEm ASC
		 LIMIT 1`,
		avaliacaoID,
	).Scan(&comentarioID, &votos)

	if erro == sql.ErrNoRows || !comentarioID.Valid {
		_, delErro := repositorio.db.Exec(
			"DELETE FROM comentario_destaque_cache WHERE avaliacao_id = $1",
			avaliacaoID,
		)
		return delErro
	}
	if erro != nil {
		return erro
	}

	_, erro = repositorio.db.Exec(
		`INSERT INTO comentario_destaque_cache (avaliacao_id, comentario_id, votos, atualizado_em)
		 VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
		 ON CONFLICT (avaliacao_id)
		 DO UPDATE SET comentario_id = EXCLUDED.comentario_id,
		               votos = EXCLUDED.votos,
		               atualizado_em = CURRENT_TIMESTAMP`,
		avaliacaoID,
		uint64(comentarioID.Int64),
		votos,
	)
	return erro
}

func pqArrayUInt64(ids []uint64) []int64 {
	resultado := make([]int64, len(ids))
	for i, id := range ids {
		resultado[i] = int64(id)
	}
	return resultado
}
