package repositorios

import (
	"backend/src/modelos"
	"database/sql"
	"fmt"
)

type Votos struct {
	db *sql.DB
}

func NovoRepositorioDeVotos(db *sql.DB) *Votos {
	return &Votos{db}
}

func (repositorio Votos) BuscarPorUsuarioEAvaliacao(usuarioID, avaliacaoID uint64) (modelos.Voto, error) {
	linha := repositorio.db.QueryRow(
		`SELECT id, usuario_id, avaliacao_id, tipo_voto, criadoEm
		 FROM voto_avaliacoes WHERE usuario_id = $1 AND avaliacao_id = $2`,
		usuarioID, avaliacaoID,
	)
	var voto modelos.Voto
	erro := linha.Scan(&voto.ID, &voto.UsuarioID, &voto.AvaliacaoID, &voto.TipoVoto, &voto.CriadoEm)
	if erro == sql.ErrNoRows {
		return modelos.Voto{}, sql.ErrNoRows
	}
	return voto, erro
}

func (repositorio Votos) Criar(tx *sql.Tx, voto modelos.Voto) (uint64, error) {
	var id uint64
	erro := tx.QueryRow(
		`INSERT INTO voto_avaliacoes (usuario_id, avaliacao_id, tipo_voto)
		 VALUES ($1, $2, $3) RETURNING id`,
		voto.UsuarioID, voto.AvaliacaoID, voto.TipoVoto,
	).Scan(&id)
	return id, erro
}

func (repositorio Votos) Atualizar(tx *sql.Tx, id uint64, tipoVoto string) error {
	_, erro := tx.Exec(
		"UPDATE voto_avaliacoes SET tipo_voto = $1 WHERE id = $2",
		tipoVoto, id,
	)
	return erro
}

func (repositorio Votos) Deletar(tx *sql.Tx, usuarioID, avaliacaoID uint64) error {
	resultado, erro := tx.Exec(
		"DELETE FROM voto_avaliacoes WHERE usuario_id = $1 AND avaliacao_id = $2",
		usuarioID, avaliacaoID,
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

func (repositorio Votos) ContarPorAvaliacao(avaliacaoID uint64) (modelos.ContadoresVoto, error) {
	linha := repositorio.db.QueryRow(
		`SELECT
			COUNT(*) FILTER (WHERE tipo_voto = 'upvote'),
			COUNT(*) FILTER (WHERE tipo_voto = 'downvote')
		 FROM voto_avaliacoes WHERE avaliacao_id = $1`,
		avaliacaoID,
	)
	var contadores modelos.ContadoresVoto
	erro := linha.Scan(&contadores.Upvotes, &contadores.Downvotes)
	if erro != nil {
		return modelos.ContadoresVoto{}, erro
	}
	contadores.Score = contadores.Upvotes - contadores.Downvotes
	return contadores, nil
}

func (repositorio Votos) ContarPorAvaliacoes(ids []uint64) (map[uint64]modelos.ContadoresVoto, error) {
	resultado := make(map[uint64]modelos.ContadoresVoto)
	if len(ids) == 0 {
		return resultado, nil
	}

	query := fmt.Sprintf(
		`SELECT avaliacao_id,
			COUNT(*) FILTER (WHERE tipo_voto = 'upvote') AS upvotes,
			COUNT(*) FILTER (WHERE tipo_voto = 'downvote') AS downvotes
		 FROM voto_avaliacoes
		 WHERE avaliacao_id IN (%s)
		 GROUP BY avaliacao_id`,
		placeholdersIN(1, len(ids)),
	)

	linhas, erro := repositorio.db.Query(query, idsParaArgs(ids)...)
	if erro != nil {
		return nil, erro
	}
	defer linhas.Close()

	for linhas.Next() {
		var avaliacaoID uint64
		var contadores modelos.ContadoresVoto
		if erro = linhas.Scan(&avaliacaoID, &contadores.Upvotes, &contadores.Downvotes); erro != nil {
			return nil, erro
		}
		contadores.Score = contadores.Upvotes - contadores.Downvotes
		resultado[avaliacaoID] = contadores
	}
	return resultado, nil
}

func (repositorio Votos) MeusVotosPorAvaliacoes(usuarioID uint64, ids []uint64) (map[uint64]string, error) {
	resultado := make(map[uint64]string)
	if len(ids) == 0 {
		return resultado, nil
	}

	args := idsParaArgs(ids)
	args = append([]interface{}{usuarioID}, args...)
	query := fmt.Sprintf(
		`SELECT avaliacao_id, tipo_voto FROM voto_avaliacoes
		 WHERE usuario_id = $1 AND avaliacao_id IN (%s)`,
		placeholdersIN(2, len(ids)),
	)

	linhas, erro := repositorio.db.Query(query, args...)
	if erro != nil {
		return nil, erro
	}
	defer linhas.Close()

	for linhas.Next() {
		var avaliacaoID uint64
		var tipoVoto string
		if erro = linhas.Scan(&avaliacaoID, &tipoVoto); erro != nil {
			return nil, erro
		}
		resultado[avaliacaoID] = tipoVoto
	}
	return resultado, nil
}
