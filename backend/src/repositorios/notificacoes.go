package repositorios

import (
	"backend/src/modelos"
	"database/sql"
)

type Notificacoes struct {
	db *sql.DB
}

func NovoRepositorioDeNotificacoes(db *sql.DB) *Notificacoes {
	return &Notificacoes{db}
}

func (repositorio Notificacoes) Criar(notificacao modelos.Notificacao) (modelos.Notificacao, error) {
	var ref sql.NullInt64
	if notificacao.ReferenciaID != nil {
		ref = sql.NullInt64{Int64: int64(*notificacao.ReferenciaID), Valid: true}
	}

	erro := repositorio.db.QueryRow(
		`INSERT INTO notificacoes (usuario_id, tipo_notificacao, titulo, conteudo, referencia_id)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, usuario_id, tipo_notificacao, titulo, conteudo, referencia_id, lida, criadoEm`,
		notificacao.UsuarioID,
		notificacao.TipoNotificacao,
		notificacao.Titulo,
		notificacao.Conteudo,
		ref,
	).Scan(
		&notificacao.ID,
		&notificacao.UsuarioID,
		&notificacao.TipoNotificacao,
		&notificacao.Titulo,
		&notificacao.Conteudo,
		&ref,
		&notificacao.Lida,
		&notificacao.CriadoEm,
	)
	if erro != nil {
		return modelos.Notificacao{}, erro
	}
	if ref.Valid {
		id := uint64(ref.Int64)
		notificacao.ReferenciaID = &id
	}
	return notificacao, nil
}

func (repositorio Notificacoes) BuscarNaoLidas(usuarioID uint64) ([]modelos.Notificacao, error) {
	linhas, erro := repositorio.db.Query(
		`SELECT id, usuario_id, tipo_notificacao, titulo, conteudo, referencia_id, lida, criadoEm
		 FROM notificacoes
		 WHERE usuario_id = $1 AND lida = FALSE AND tipo_notificacao <> 'mensagem'
		 ORDER BY criadoEm DESC
		 LIMIT 50`,
		usuarioID,
	)
	if erro != nil {
		return nil, erro
	}
	defer linhas.Close()

	return scanNotificacoes(linhas)
}

func (repositorio Notificacoes) BuscarTodas(usuarioID uint64) ([]modelos.Notificacao, error) {
	linhas, erro := repositorio.db.Query(
		`SELECT id, usuario_id, tipo_notificacao, titulo, conteudo, referencia_id, lida, criadoEm
		 FROM notificacoes
		 WHERE usuario_id = $1 AND tipo_notificacao <> 'mensagem'
		 ORDER BY criadoEm DESC
		 LIMIT 100`,
		usuarioID,
	)
	if erro != nil {
		return nil, erro
	}
	defer linhas.Close()

	return scanNotificacoes(linhas)
}

func (repositorio Notificacoes) ContarNaoLidas(usuarioID uint64) (int, error) {
	var total int
	erro := repositorio.db.QueryRow(
		`SELECT COUNT(*) FROM notificacoes WHERE usuario_id = $1 AND lida = FALSE AND tipo_notificacao <> 'mensagem'`,
		usuarioID,
	).Scan(&total)
	return total, erro
}

func (repositorio Notificacoes) MarcarComoLida(usuarioID, notificacaoID uint64) error {
	res, erro := repositorio.db.Exec(
		`UPDATE notificacoes SET lida = TRUE WHERE id = $1 AND usuario_id = $2`,
		notificacaoID, usuarioID,
	)
	if erro != nil {
		return erro
	}
	linhas, _ := res.RowsAffected()
	if linhas == 0 {
		return sql.ErrNoRows
	}
	return nil
}

func scanNotificacoes(linhas *sql.Rows) ([]modelos.Notificacao, error) {
	resultado := make([]modelos.Notificacao, 0)
	for linhas.Next() {
		var n modelos.Notificacao
		var ref sql.NullInt64
		if erro := linhas.Scan(
			&n.ID,
			&n.UsuarioID,
			&n.TipoNotificacao,
			&n.Titulo,
			&n.Conteudo,
			&ref,
			&n.Lida,
			&n.CriadoEm,
		); erro != nil {
			return nil, erro
		}
		if ref.Valid {
			id := uint64(ref.Int64)
			n.ReferenciaID = &id
		}
		resultado = append(resultado, n)
	}
	return resultado, nil
}
