package repositorios



import (

	"backend/src/modelos"

	"database/sql"

)



type Mensagens struct {

	db *sql.DB

}



func NovoRepositorioDeMensagens(db *sql.DB) *Mensagens {

	return &Mensagens{db}

}



func scanMensagem(linhas interface {

	Scan(dest ...any) error

}, m *modelos.Mensagem) error {

	var anexo, reacao sql.NullString

	var respostaAID sql.NullInt64

	var respostaID sql.NullInt64

	var respostaConteudo sql.NullString

	var respostaRemetente sql.NullInt64

	var respostaAnexo sql.NullString



	if erro := linhas.Scan(

		&m.ID,

		&m.RemetenteID,

		&m.DestinatarioID,

		&m.Conteudo,

		&m.Lida,

		&m.CriadoEm,

		&anexo,

		&m.Editada,

		&respostaAID,

		&reacao,

		&m.ApagadoPorRemetente,

		&m.ApagadoPorDestinatario,

		&respostaID,

		&respostaConteudo,

		&respostaRemetente,

		&respostaAnexo,

	); erro != nil {

		return erro

	}



	if anexo.Valid {

		m.AnexoURL = &anexo.String

	}

	if respostaAID.Valid {

		id := uint64(respostaAID.Int64)

		m.RespostaAID = &id

	}

	if reacao.Valid {

		m.Reacao = &reacao.String

	}

	if respostaID.Valid {

		resumo := &modelos.MensagemResumo{

			ID:          uint64(respostaID.Int64),

			RemetenteID: uint64(respostaRemetente.Int64),

			Conteudo:    respostaConteudo.String,

		}

		if respostaAnexo.Valid {

			resumo.AnexoURL = &respostaAnexo.String

		}

		m.RespostaA = resumo

	}



	return nil

}



const filtroVisivelUsuario = `((remetente_id = $1 AND apagado_por_remetente = FALSE) OR (destinatario_id = $1 AND apagado_por_destinatario = FALSE))`



const selectMensagemComResposta = `SELECT m.id, m.remetente_id, m.destinatario_id, m.conteudo, m.lida, m.criadoEm, m.anexo_url,

	m.editada, m.resposta_a_id, m.reacao, m.apagado_por_remetente, m.apagado_por_destinatario,

	r.id, r.conteudo, r.remetente_id, r.anexo_url`



func (repositorio Mensagens) BuscarConversas(meuID uint64) ([]modelos.ConversaResumo, error) {

	linhas, erro := repositorio.db.Query(

		`WITH conversas AS (

			SELECT

				CASE WHEN remetente_id = $1 THEN destinatario_id ELSE remetente_id END AS outro_id,

				conteudo,

				anexo_url,

				criadoEm,

				remetente_id,

				ROW_NUMBER() OVER (

					PARTITION BY CASE WHEN remetente_id = $1 THEN destinatario_id ELSE remetente_id END

					ORDER BY criadoEm DESC

				) AS rn

			FROM mensagens

			WHERE (remetente_id = $1 OR destinatario_id = $1)

			  AND `+filtroVisivelUsuario+`

		)

		SELECT c.outro_id, u.nome, u.nick, u.image_url,

		       COALESCE(NULLIF(TRIM(c.conteudo), ''), CASE WHEN c.anexo_url IS NOT NULL AND c.anexo_url <> '' THEN '📷 Imagem' ELSE '' END),

		       c.criadoEm, c.remetente_id,

		       (cf.usuario_id IS NOT NULL) AS fixada,

		       (SELECT COUNT(*)::int FROM mensagens m2

		        WHERE m2.destinatario_id = $1

		          AND m2.remetente_id = c.outro_id

		          AND m2.lida = FALSE

		          AND m2.apagado_por_destinatario = FALSE) AS nao_lidas

		FROM conversas c

		INNER JOIN usuarios u ON u.id = c.outro_id AND u.status = 'ativo'

		LEFT JOIN conversas_fixadas cf ON cf.usuario_id = $1 AND cf.outro_usuario_id = c.outro_id

		WHERE c.rn = 1

		ORDER BY fixada DESC, c.criadoEm DESC`,

		meuID,

	)

	if erro != nil {

		return nil, erro

	}

	defer linhas.Close()



	resultado := make([]modelos.ConversaResumo, 0)

	for linhas.Next() {

		var c modelos.ConversaResumo

		var image sql.NullString

		var remetenteID uint64



		if erro := linhas.Scan(

			&c.UsuarioID,

			&c.Nome,

			&c.Nick,

			&image,

			&c.UltimaMensagem,

			&c.UltimaMensagemEm,

			&remetenteID,

			&c.Fixada,

			&c.NaoLidas,

		); erro != nil {

			return nil, erro

		}



		if image.Valid {

			c.Image = image.String

		}

		c.EnviadaPorMim = remetenteID == meuID

		resultado = append(resultado, c)

	}



	return resultado, nil

}



func (repositorio Mensagens) BuscarHistorico(meuID, outroID uint64) ([]modelos.Mensagem, error) {

	linhas, erro := repositorio.db.Query(

		selectMensagemComResposta+`

		 FROM mensagens m

		 LEFT JOIN mensagens r ON r.id = m.resposta_a_id

		 WHERE ((m.remetente_id = $1 AND m.destinatario_id = $2)

		    OR (m.remetente_id = $2 AND m.destinatario_id = $1))

		   AND ((m.remetente_id = $1 AND m.apagado_por_remetente = FALSE)

		     OR (m.destinatario_id = $1 AND m.apagado_por_destinatario = FALSE))

		 ORDER BY m.criadoEm ASC`,

		meuID, outroID,

	)

	if erro != nil {

		return nil, erro

	}

	defer linhas.Close()



	mensagens := make([]modelos.Mensagem, 0)

	for linhas.Next() {

		var m modelos.Mensagem

		if erro := scanMensagem(linhas, &m); erro != nil {

			return nil, erro

		}

		mensagens = append(mensagens, m)

	}



	return mensagens, nil

}



func (repositorio Mensagens) Enviar(remetenteID, destinatarioID uint64, conteudo, anexoURL string, respostaAID *uint64) (modelos.Mensagem, error) {

	var m modelos.Mensagem

	var anexo sql.NullString

	if anexoURL != "" {

		anexo = sql.NullString{String: anexoURL, Valid: true}

	}



	var resposta sql.NullInt64

	if respostaAID != nil && *respostaAID > 0 {

		resposta = sql.NullInt64{Int64: int64(*respostaAID), Valid: true}

	}



	erro := repositorio.db.QueryRow(

		`INSERT INTO mensagens (remetente_id, destinatario_id, conteudo, anexo_url, resposta_a_id)

		 VALUES ($1, $2, $3, $4, $5)

		 RETURNING id`,

		remetenteID, destinatarioID, conteudo, anexo, resposta,

	).Scan(&m.ID)

	if erro != nil {

		return modelos.Mensagem{}, erro

	}



	historico, erro := repositorio.BuscarHistorico(remetenteID, destinatarioID)

	if erro != nil {

		return modelos.Mensagem{}, erro

	}



	for _, msg := range historico {

		if msg.ID == m.ID {

			return msg, nil

		}

	}



	return modelos.Mensagem{}, sql.ErrNoRows

}



func (repositorio Mensagens) ApagarConversa(meuID, outroID uint64) error {

	tx, erro := repositorio.db.Begin()

	if erro != nil {

		return erro

	}

	defer tx.Rollback()



	if _, erro = tx.Exec(

		`UPDATE mensagens SET apagado_por_remetente = TRUE WHERE remetente_id = $1 AND destinatario_id = $2`,

		meuID, outroID,

	); erro != nil {

		return erro

	}



	if _, erro = tx.Exec(

		`UPDATE mensagens SET apagado_por_destinatario = TRUE WHERE remetente_id = $1 AND destinatario_id = $2`,

		outroID, meuID,

	); erro != nil {

		return erro

	}



	return tx.Commit()

}



func (repositorio Mensagens) ApagarMensagem(meuID, mensagemID uint64) (modelos.Mensagem, error) {
	var m modelos.Mensagem

	erro := repositorio.db.QueryRow(
		`UPDATE mensagens SET apagado_por_remetente = TRUE
		 WHERE id = $1 AND remetente_id = $2
		 RETURNING id, remetente_id, destinatario_id, apagado_por_remetente, apagado_por_destinatario, criadoEm`,
		mensagemID, meuID,
	).Scan(
		&m.ID,
		&m.RemetenteID,
		&m.DestinatarioID,
		&m.ApagadoPorRemetente,
		&m.ApagadoPorDestinatario,
		&m.CriadoEm,
	)
	if erro != nil {
		return modelos.Mensagem{}, erro
	}

	return m, nil
}



func (repositorio Mensagens) EditarMensagem(meuID, mensagemID uint64, conteudo string) (modelos.Mensagem, error) {

	var destinatarioID uint64

	erro := repositorio.db.QueryRow(

		`UPDATE mensagens SET conteudo = $1, editada = TRUE

		 WHERE id = $2 AND remetente_id = $3

		 RETURNING destinatario_id`,

		conteudo, mensagemID, meuID,

	).Scan(&destinatarioID)

	if erro != nil {

		return modelos.Mensagem{}, erro

	}



	historico, erro := repositorio.BuscarHistorico(meuID, destinatarioID)

	if erro != nil {

		return modelos.Mensagem{}, erro

	}



	for _, msg := range historico {

		if msg.ID == mensagemID {

			return msg, nil

		}

	}



	return modelos.Mensagem{}, sql.ErrNoRows

}



func (repositorio Mensagens) ReagirMensagem(meuID, mensagemID uint64, reacao string) (modelos.Mensagem, error) {

	var outroID uint64

	erro := repositorio.db.QueryRow(

		`UPDATE mensagens SET reacao = $1

		 WHERE id = $2 AND (remetente_id = $3 OR destinatario_id = $3)

		 RETURNING CASE WHEN remetente_id = $3 THEN destinatario_id ELSE remetente_id END`,

		reacao, mensagemID, meuID,

	).Scan(&outroID)

	if erro != nil {

		return modelos.Mensagem{}, erro

	}



	historico, erro := repositorio.BuscarHistorico(meuID, outroID)

	if erro != nil {

		return modelos.Mensagem{}, erro

	}



	for _, msg := range historico {

		if msg.ID == mensagemID {

			return msg, nil

		}

	}



	return modelos.Mensagem{}, sql.ErrNoRows

}



func (repositorio Mensagens) ToggleFixarConversa(meuID, outroID uint64) (bool, error) {

	var existe bool

	erro := repositorio.db.QueryRow(

		`SELECT EXISTS(SELECT 1 FROM conversas_fixadas WHERE usuario_id = $1 AND outro_usuario_id = $2)`,

		meuID, outroID,

	).Scan(&existe)

	if erro != nil {

		return false, erro

	}



	if existe {

		_, erro = repositorio.db.Exec(

			`DELETE FROM conversas_fixadas WHERE usuario_id = $1 AND outro_usuario_id = $2`,

			meuID, outroID,

		)

		return false, erro

	}



	_, erro = repositorio.db.Exec(

		`INSERT INTO conversas_fixadas (usuario_id, outro_usuario_id) VALUES ($1, $2)`,

		meuID, outroID,

	)

	return true, erro

}



func (repositorio Mensagens) BuscarMensagemPorID(meuID, mensagemID uint64) (modelos.Mensagem, error) {

	linhas, erro := repositorio.db.Query(

		selectMensagemComResposta+`

		 FROM mensagens m

		 LEFT JOIN mensagens r ON r.id = m.resposta_a_id

		 WHERE m.id = $1 AND (m.remetente_id = $2 OR m.destinatario_id = $2)`,

		mensagemID, meuID,

	)

	if erro != nil {

		return modelos.Mensagem{}, erro

	}

	defer linhas.Close()



	if !linhas.Next() {

		return modelos.Mensagem{}, sql.ErrNoRows

	}



	var m modelos.Mensagem

	if erro := scanMensagem(linhas, &m); erro != nil {

		return modelos.Mensagem{}, erro

	}



	return m, nil

}

func (repositorio Mensagens) MarcarComoLida(meuID, mensagemID uint64) error {
	res, erro := repositorio.db.Exec(
		`UPDATE mensagens SET lida = TRUE WHERE id = $1 AND destinatario_id = $2`,
		mensagemID, meuID,
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

func (repositorio Mensagens) MarcarConversaComoLida(meuID, outroID uint64) error {
	_, erro := repositorio.db.Exec(
		`UPDATE mensagens SET lida = TRUE
		 WHERE destinatario_id = $1 AND remetente_id = $2 AND lida = FALSE`,
		meuID, outroID,
	)
	return erro
}

func (repositorio Mensagens) ContarNaoLidasTotal(meuID uint64) (int, error) {
	var total int
	erro := repositorio.db.QueryRow(
		`SELECT COUNT(*)::int FROM mensagens
		 WHERE destinatario_id = $1 AND lida = FALSE AND apagado_por_destinatario = FALSE`,
		meuID,
	).Scan(&total)
	return total, erro
}

func (repositorio Mensagens) ContarNaoLidasComUsuario(meuID, outroID uint64) (int, error) {
	var total int
	erro := repositorio.db.QueryRow(
		`SELECT COUNT(*)::int FROM mensagens
		 WHERE destinatario_id = $1 AND remetente_id = $2 AND lida = FALSE AND apagado_por_destinatario = FALSE`,
		meuID, outroID,
	).Scan(&total)
	return total, erro
}

func (repositorio Mensagens) BuscarMensagemAdminPorID(mensagemID uint64) (modelos.Mensagem, error) {
	var m modelos.Mensagem
	erro := repositorio.db.QueryRow(
		`SELECT id, remetente_id, destinatario_id, conteudo, criadoEm
		 FROM mensagens WHERE id = $1`,
		mensagemID,
	).Scan(&m.ID, &m.RemetenteID, &m.DestinatarioID, &m.Conteudo, &m.CriadoEm)
	if erro != nil {
		return modelos.Mensagem{}, erro
	}
	return m, nil
}

func (repositorio Mensagens) ApagarPorAdmin(mensagemID uint64) error {
	resultado, erro := repositorio.db.Exec(
		`UPDATE mensagens
		 SET apagado_por_remetente = TRUE, apagado_por_destinatario = TRUE
		 WHERE id = $1`,
		mensagemID,
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

