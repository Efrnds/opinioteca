package repositorios

import (
	"backend/src/modelos"
	"database/sql"
	"fmt"
	"strings"
)

type Denuncias struct {
	db *sql.DB
}

func NovoRepositorioDeDenuncias(db *sql.DB) *Denuncias {
	return &Denuncias{db}
}

func (repositorio Denuncias) Criar(denuncia modelos.Denuncia) (modelos.Denuncia, error) {
	var criada modelos.Denuncia
	var descricao sql.NullString
	if denuncia.Descricao != nil && *denuncia.Descricao != "" {
		descricao = sql.NullString{String: *denuncia.Descricao, Valid: true}
	}

	erro := repositorio.db.QueryRow(
		`INSERT INTO denuncias (denunciante_id, tipo_entidade, referencia_id, motivo, descricao)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, denunciante_id, tipo_entidade, referencia_id, motivo, descricao, status, criadoEm`,
		denuncia.DenuncianteID,
		denuncia.TipoEntidade,
		denuncia.ReferenciaID,
		denuncia.Motivo,
		descricao,
	).Scan(
		&criada.ID,
		&criada.DenuncianteID,
		&criada.TipoEntidade,
		&criada.ReferenciaID,
		&criada.Motivo,
		&descricao,
		&criada.Status,
		&criada.CriadoEm,
	)
	if erro != nil {
		return modelos.Denuncia{}, erro
	}
	if descricao.Valid {
		criada.Descricao = &descricao.String
	}
	return criada, nil
}

func (repositorio Denuncias) Listar(status, tipo string) ([]modelos.DenunciaListItem, error) {
	itens, _, erro := repositorio.ListarPaginado(status, tipo, 100000, 0)
	return itens, erro
}

func (repositorio Denuncias) ListarPaginado(status, tipo string, limite, offset int) ([]modelos.DenunciaListItem, int, error) {
	if limite <= 0 {
		limite = 20
	}
	if offset < 0 {
		offset = 0
	}

	var condicoes []string
	var args []interface{}
	argIndex := 1

	if status != "" {
		condicoes = append(condicoes, fmt.Sprintf("d.status = $%d", argIndex))
		args = append(args, status)
		argIndex++
	}
	if tipo != "" {
		condicoes = append(condicoes, fmt.Sprintf("d.tipo_entidade = $%d", argIndex))
		args = append(args, tipo)
		argIndex++
	}

	where := ""
	if len(condicoes) > 0 {
		where = " WHERE " + strings.Join(condicoes, " AND ")
	}

	var total int
	if erro := repositorio.db.QueryRow("SELECT COUNT(*) FROM denuncias d"+where, args...).Scan(&total); erro != nil {
		return nil, 0, erro
	}

	query := `SELECT d.id, d.tipo_entidade, d.referencia_id, d.motivo, d.status, d.criadoEm,
	                 u.nick, u.nome
	          FROM denuncias d
	          INNER JOIN usuarios u ON u.id = d.denunciante_id` + where +
		fmt.Sprintf(" ORDER BY d.criadoEm DESC LIMIT $%d OFFSET $%d", argIndex, argIndex+1)
	args = append(args, limite, offset)

	linhas, erro := repositorio.db.Query(query, args...)
	if erro != nil {
		return nil, 0, erro
	}
	defer linhas.Close()

	itens := make([]modelos.DenunciaListItem, 0)
	for linhas.Next() {
		var item modelos.DenunciaListItem
		if erro := linhas.Scan(
			&item.ID,
			&item.TipoEntidade,
			&item.ReferenciaID,
			&item.Motivo,
			&item.Status,
			&item.CriadoEm,
			&item.DenuncianteNick,
			&item.DenuncianteNome,
		); erro != nil {
			return nil, 0, erro
		}
		itens = append(itens, item)
	}
	return itens, total, nil
}

func (repositorio Denuncias) ContarPendentes() (int, error) {
	var total int
	erro := repositorio.db.QueryRow(
		`SELECT COUNT(*) FROM denuncias WHERE status = 'pendente'`,
	).Scan(&total)
	return total, erro
}

func (repositorio Denuncias) BuscarPorID(id uint64) (modelos.Denuncia, error) {
	var denuncia modelos.Denuncia
	var descricao, resolucao sql.NullString
	var adminID sql.NullInt64
	var resolvidaEm sql.NullTime

	erro := repositorio.db.QueryRow(
		`SELECT id, denunciante_id, tipo_entidade, referencia_id, motivo, descricao,
		        status, admin_id, resolucao, criadoEm, resolvida_em
		 FROM denuncias WHERE id = $1`,
		id,
	).Scan(
		&denuncia.ID,
		&denuncia.DenuncianteID,
		&denuncia.TipoEntidade,
		&denuncia.ReferenciaID,
		&denuncia.Motivo,
		&descricao,
		&denuncia.Status,
		&adminID,
		&resolucao,
		&denuncia.CriadoEm,
		&resolvidaEm,
	)
	if erro != nil {
		return modelos.Denuncia{}, erro
	}
	if descricao.Valid {
		denuncia.Descricao = &descricao.String
	}
	if adminID.Valid {
		valor := uint64(adminID.Int64)
		denuncia.AdminID = &valor
	}
	if resolucao.Valid {
		denuncia.Resolucao = &resolucao.String
	}
	if resolvidaEm.Valid {
		denuncia.ResolvidaEm = &resolvidaEm.Time
	}
	return denuncia, nil
}

func (repositorio Denuncias) BuscarDenuncianteInfo(denuncianteID uint64) (nick, nome string, erro error) {
	erro = repositorio.db.QueryRow(
		`SELECT nick, nome FROM usuarios WHERE id = $1`,
		denuncianteID,
	).Scan(&nick, &nome)
	return
}

func (repositorio Denuncias) Resolver(id, adminID uint64, status, resolucao string) error {
	resultado, erro := repositorio.db.Exec(
		`UPDATE denuncias
		 SET status = $1, admin_id = $2, resolucao = $3, resolvida_em = CURRENT_TIMESTAMP
		 WHERE id = $4 AND status IN ('pendente', 'em_analise')`,
		status,
		adminID,
		resolucao,
		id,
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

const filtroDenunciasContraUsuario = `
	(d.tipo_entidade = 'usuario' AND d.referencia_id = $1)
	OR (d.tipo_entidade = 'avaliacao' AND d.referencia_id IN (SELECT id FROM avaliacoes WHERE usuario_id = $1))
	OR (d.tipo_entidade = 'comentario' AND d.referencia_id IN (SELECT id FROM comentarios WHERE usuario_id = $1))
	OR (d.tipo_entidade = 'mensagem' AND d.referencia_id IN (SELECT id FROM mensagens WHERE remetente_id = $1))
`

// UsuarioDenunciadoID resolve o usuário alvo de uma denúncia a partir do tipo e referência.
func (repositorio Denuncias) UsuarioDenunciadoID(tipoEntidade string, referenciaID uint64) (uint64, error) {
	switch tipoEntidade {
	case modelos.TipoEntidadeAvaliacao:
		var usuarioID uint64
		erro := repositorio.db.QueryRow(
			`SELECT usuario_id FROM avaliacoes WHERE id = $1`,
			referenciaID,
		).Scan(&usuarioID)
		return usuarioID, erro

	case modelos.TipoEntidadeComentario:
		var usuarioID uint64
		erro := repositorio.db.QueryRow(
			`SELECT usuario_id FROM comentarios WHERE id = $1`,
			referenciaID,
		).Scan(&usuarioID)
		return usuarioID, erro

	case modelos.TipoEntidadeUsuario:
		var existe uint64
		erro := repositorio.db.QueryRow(
			`SELECT id FROM usuarios WHERE id = $1`,
			referenciaID,
		).Scan(&existe)
		if erro != nil {
			return 0, erro
		}
		return referenciaID, nil

	case modelos.TipoEntidadeMensagem:
		var remetenteID uint64
		erro := repositorio.db.QueryRow(
			`SELECT remetente_id FROM mensagens WHERE id = $1`,
			referenciaID,
		).Scan(&remetenteID)
		return remetenteID, erro

	default:
		return 0, fmt.Errorf("tipo_entidade inválido")
	}
}

// ContarDenunciasContraUsuario totaliza denúncias feitas contra um usuário (qualquer status).
func (repositorio Denuncias) ContarDenunciasContraUsuario(usuarioID uint64) (int, error) {
	var total int
	erro := repositorio.db.QueryRow(
		fmt.Sprintf(`SELECT COUNT(*) FROM denuncias d WHERE %s`, filtroDenunciasContraUsuario),
		usuarioID,
	).Scan(&total)
	return total, erro
}

// ContarDenunciasProcedentesContraUsuario conta denúncias resolvidas (procedentes),
// agrupando por entidade denunciada para evitar contagem duplicada do mesmo conteúdo.
func (repositorio Denuncias) ContarDenunciasProcedentesContraUsuario(usuarioID uint64) (int, error) {
	var total int
	erro := repositorio.db.QueryRow(
		fmt.Sprintf(`
			SELECT COUNT(*) FROM (
				SELECT DISTINCT d.tipo_entidade, d.referencia_id
				FROM denuncias d
				WHERE d.status = 'resolvida' AND (%s)
			) sub`, filtroDenunciasContraUsuario),
		usuarioID,
	).Scan(&total)
	return total, erro
}
