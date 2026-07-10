package repositorios

import (
	"backend/src/modelos"
	"database/sql"
	"time"
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
		`INSERT INTO avaliacoes (usuario_id, livro_id, template_id, nota, texto, contem_spoiler, anexo_url, score_sentimento)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
		avaliacao.UsuarioID,
		avaliacao.LivroID,
		avaliacao.TemplateID,
		avaliacao.Nota,
		avaliacao.Texto,
		avaliacao.ContemSpoiler,
		avaliacao.AnexoURL,
		avaliacao.ScoreSentimento,
	).Scan(&id)
	if erro != nil {
		return 0, erro
	}
	return id, nil
}

func (repositorio Avaliacoes) BuscarPorID(id uint64) (modelos.Avaliacao, error) {
	linha := repositorio.db.QueryRow(
		`SELECT id, usuario_id, livro_id, template_id, nota, texto, contem_spoiler, anexo_url, score_sentimento, criadoEm
		 FROM avaliacoes WHERE id = $1`, id)
	return scanAvaliacao(linha)
}

func (repositorio Avaliacoes) BuscarPorLivro(livroID uint64) ([]modelos.Avaliacao, error) {
	linhas, erro := repositorio.db.Query(
		`SELECT id, usuario_id, livro_id, template_id, nota, texto, contem_spoiler, anexo_url, score_sentimento, criadoEm
		 FROM avaliacoes WHERE livro_id = $1 ORDER BY criadoEm DESC`, livroID)
	if erro != nil {
		return nil, erro
	}
	defer linhas.Close()
	return scanAvaliacoes(linhas)
}

func (repositorio Avaliacoes) BuscarFeedPorLivro(livroID uint64) ([]modelos.AvaliacaoFeed, error) {
	linhas, erro := repositorio.db.Query(
		`SELECT a.id, a.nota, a.texto, a.contem_spoiler, a.anexo_url, a.criadoEm,
		        (SELECT COUNT(*) FROM comentarios c WHERE c.avaliacao_id = a.id) AS qtd_comentarios,
		        u.id, u.nome, u.nick, u.image_url, u.assinatura_id, u.assinatura_expira_em, u.status,
		        l.id, l.titulo, l.autor, l.capa_url
		 FROM avaliacoes a
		 INNER JOIN usuarios u ON u.id = a.usuario_id
		 INNER JOIN livros l ON l.id = a.livro_id AND l.status = 'ativo'
		 WHERE a.livro_id = $1
		 ORDER BY a.criadoEm DESC`,
		livroID,
	)
	if erro != nil {
		return nil, erro
	}
	defer linhas.Close()

	feed := make([]modelos.AvaliacaoFeed, 0)
	repoComentarios := NovoRepositorioDeComentarios(repositorio.db)
	for linhas.Next() {
		var item modelos.AvaliacaoFeed
		var imageURL, capaURL, anexoURL sql.NullString
		var assinaturaID uint64
		var assinaturaExpira sql.NullTime
		var statusUsuario string

		if erro := linhas.Scan(
			&item.ID,
			&item.Nota,
			&item.Texto,
			&item.ContemSpoiler,
			&anexoURL,
			&item.CriadoEm,
			&item.QtdComentarios,
			&item.Usuario.ID,
			&item.Usuario.Nome,
			&item.Usuario.Nick,
			&imageURL,
			&assinaturaID,
			&assinaturaExpira,
			&statusUsuario,
			&item.Livro.ID,
			&item.Livro.Titulo,
			&item.Livro.Autor,
			&capaURL,
		); erro != nil {
			return nil, erro
		}

		aplicarUsuarioFeed(&item, statusUsuario, imageURL, assinaturaID, assinaturaExpira)
		if capaURL.Valid {
			item.Livro.CapaURL = capaURL.String
		}
		if anexoURL.Valid {
			item.AnexoURL = &anexoURL.String
		}
		destaque, erro := repoComentarios.BuscarComentarioDestaque(item.ID)
		if erro != nil {
			return nil, erro
		}
		item.ComentarioDestaque = destaque

		feed = append(feed, item)
	}

	return feed, nil
}

func (repositorio Avaliacoes) BuscarFeedPorID(id uint64) (modelos.AvaliacaoFeed, error) {
	linha := repositorio.db.QueryRow(
		`SELECT a.id, a.nota, a.texto, a.contem_spoiler, a.anexo_url, a.criadoEm,
		        (SELECT COUNT(*) FROM comentarios c WHERE c.avaliacao_id = a.id) AS qtd_comentarios,
		        u.id, u.nome, u.nick, u.image_url, u.assinatura_id, u.assinatura_expira_em, u.status,
		        l.id, l.titulo, l.autor, l.capa_url
		 FROM avaliacoes a
		 INNER JOIN usuarios u ON u.id = a.usuario_id
		 INNER JOIN livros l ON l.id = a.livro_id AND l.status = 'ativo'
		 WHERE a.id = $1`,
		id,
	)

	var item modelos.AvaliacaoFeed
	var imageURL, capaURL, anexoURL sql.NullString
	var assinaturaID uint64
	var assinaturaExpira sql.NullTime
	var statusUsuario string

	if erro := linha.Scan(
		&item.ID,
		&item.Nota,
		&item.Texto,
		&item.ContemSpoiler,
		&anexoURL,
		&item.CriadoEm,
		&item.QtdComentarios,
		&item.Usuario.ID,
		&item.Usuario.Nome,
		&item.Usuario.Nick,
		&imageURL,
		&assinaturaID,
		&assinaturaExpira,
		&statusUsuario,
		&item.Livro.ID,
		&item.Livro.Titulo,
		&item.Livro.Autor,
		&capaURL,
	); erro != nil {
		return modelos.AvaliacaoFeed{}, erro
	}

	aplicarUsuarioFeed(&item, statusUsuario, imageURL, assinaturaID, assinaturaExpira)
	if capaURL.Valid {
		item.Livro.CapaURL = capaURL.String
	}
	if anexoURL.Valid {
		item.AnexoURL = &anexoURL.String
	}

	destaque, erro := NovoRepositorioDeComentarios(repositorio.db).BuscarComentarioDestaque(item.ID)
	if erro != nil {
		return modelos.AvaliacaoFeed{}, erro
	}
	item.ComentarioDestaque = destaque

	return item, nil
}

func (repositorio Avaliacoes) BuscarPorUsuario(usuarioID uint64) ([]modelos.Avaliacao, error) {
	linhas, erro := repositorio.db.Query(
		`SELECT id, usuario_id, livro_id, template_id, nota, texto, contem_spoiler, anexo_url, score_sentimento, criadoEm
		 FROM avaliacoes WHERE usuario_id = $1 ORDER BY criadoEm DESC`, usuarioID)
	if erro != nil {
		return nil, erro
	}
	defer linhas.Close()
	return scanAvaliacoes(linhas)
}

const selectFeedBase = `SELECT a.id, a.nota, a.texto, a.contem_spoiler, a.anexo_url, a.criadoEm,
		        (SELECT COUNT(*) FROM comentarios c WHERE c.avaliacao_id = a.id) AS qtd_comentarios,
		        u.id, u.nome, u.nick, u.image_url, u.assinatura_id, u.assinatura_expira_em, u.status,
		        l.id, l.titulo, l.autor, l.capa_url
		 FROM avaliacoes a
		 INNER JOIN usuarios u ON u.id = a.usuario_id
		 INNER JOIN livros l ON l.id = a.livro_id AND l.status = 'ativo'`

func (repositorio Avaliacoes) BuscarFeed(limite int, cursorCriadoEm *time.Time, cursorID *uint64) ([]modelos.AvaliacaoFeed, error) {
	var (
		linhas *sql.Rows
		erro   error
	)

	if cursorCriadoEm != nil && cursorID != nil {
		linhas, erro = repositorio.db.Query(
			selectFeedBase+`
		 WHERE (a.criadoEm, a.id) < ($1, $2)
		 ORDER BY a.criadoEm DESC, a.id DESC
		 LIMIT $3`,
			*cursorCriadoEm, *cursorID, limite,
		)
	} else {
		linhas, erro = repositorio.db.Query(
			selectFeedBase+`
		 ORDER BY a.criadoEm DESC, a.id DESC
		 LIMIT $1`,
			limite,
		)
	}
	if erro != nil {
		return nil, erro
	}
	defer linhas.Close()

	return repositorio.escanearFeed(linhas)
}

func (repositorio Avaliacoes) BuscarFeedSeguindo(usuarioID uint64, limite int, cursorCriadoEm *time.Time, cursorID *uint64) ([]modelos.AvaliacaoFeed, error) {
	var (
		linhas *sql.Rows
		erro   error
	)

	filtroSeguindo := `
		 WHERE (a.usuario_id IN (
		     SELECT id_seguido FROM seguidores WHERE id_seguidor = $1
		 ) OR a.usuario_id = $1)`

	if cursorCriadoEm != nil && cursorID != nil {
		linhas, erro = repositorio.db.Query(
			selectFeedBase+filtroSeguindo+`
		 AND (a.criadoEm, a.id) < ($2, $3)
		 ORDER BY a.criadoEm DESC, a.id DESC
		 LIMIT $4`,
			usuarioID, *cursorCriadoEm, *cursorID, limite,
		)
	} else {
		linhas, erro = repositorio.db.Query(
			selectFeedBase+filtroSeguindo+`
		 ORDER BY a.criadoEm DESC, a.id DESC
		 LIMIT $2`,
			usuarioID, limite,
		)
	}
	if erro != nil {
		return nil, erro
	}
	defer linhas.Close()

	return repositorio.escanearFeed(linhas)
}

func (repositorio Avaliacoes) escanearFeed(linhas *sql.Rows) ([]modelos.AvaliacaoFeed, error) {
	feed := make([]modelos.AvaliacaoFeed, 0)
	avaliacaoIDs := make([]uint64, 0)
	for linhas.Next() {
		var item modelos.AvaliacaoFeed
		var imageURL, capaURL, anexoURL sql.NullString
		var assinaturaID uint64
		var assinaturaExpira sql.NullTime
		var statusUsuario string

		if erro := linhas.Scan(
			&item.ID,
			&item.Nota,
			&item.Texto,
			&item.ContemSpoiler,
			&anexoURL,
			&item.CriadoEm,
			&item.QtdComentarios,
			&item.Usuario.ID,
			&item.Usuario.Nome,
			&item.Usuario.Nick,
			&imageURL,
			&assinaturaID,
			&assinaturaExpira,
			&statusUsuario,
			&item.Livro.ID,
			&item.Livro.Titulo,
			&item.Livro.Autor,
			&capaURL,
		); erro != nil {
			return nil, erro
		}

		aplicarUsuarioFeed(&item, statusUsuario, imageURL, assinaturaID, assinaturaExpira)
		if capaURL.Valid {
			item.Livro.CapaURL = capaURL.String
		}
		if anexoURL.Valid {
			item.AnexoURL = &anexoURL.String
		}

		feed = append(feed, item)
		avaliacaoIDs = append(avaliacaoIDs, item.ID)
	}

	repoComentarios := NovoRepositorioDeComentarios(repositorio.db)
	destaques, erro := repoComentarios.BuscarDestaquesPorAvaliacoes(avaliacaoIDs)
	if erro != nil {
		return nil, erro
	}

	for i := range feed {
		feed[i].ComentarioDestaque = destaques[feed[i].ID]
	}

	return feed, nil
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

func (repositorio Avaliacoes) DeletarPorAdmin(id uint64) error {
	tx, erro := repositorio.db.Begin()
	if erro != nil {
		return erro
	}
	defer tx.Rollback()

	if _, erro = tx.Exec(
		`DELETE FROM voto_comentarios
		 WHERE comentario_id IN (SELECT id FROM comentarios WHERE avaliacao_id = $1)`,
		id,
	); erro != nil {
		return erro
	}

	if _, erro = tx.Exec(`DELETE FROM comentario_destaque_cache WHERE avaliacao_id = $1`, id); erro != nil {
		return erro
	}

	if _, erro = tx.Exec(`DELETE FROM comentarios WHERE avaliacao_id = $1`, id); erro != nil {
		return erro
	}

	if _, erro = tx.Exec(`DELETE FROM voto_avaliacoes WHERE avaliacao_id = $1`, id); erro != nil {
		return erro
	}

	resultado, erro := tx.Exec("DELETE FROM avaliacoes WHERE id = $1", id)
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

	return tx.Commit()
}

func (repositorio Avaliacoes) Deletar(id, usuarioID uint64) error {
	tx, erro := repositorio.db.Begin()
	if erro != nil {
		return erro
	}
	defer tx.Rollback()

	if _, erro = tx.Exec(
		`DELETE FROM voto_comentarios
		 WHERE comentario_id IN (SELECT id FROM comentarios WHERE avaliacao_id = $1)`,
		id,
	); erro != nil {
		return erro
	}

	if _, erro = tx.Exec(`DELETE FROM comentario_destaque_cache WHERE avaliacao_id = $1`, id); erro != nil {
		return erro
	}

	if _, erro = tx.Exec(`DELETE FROM comentarios WHERE avaliacao_id = $1`, id); erro != nil {
		return erro
	}

	if _, erro = tx.Exec(`DELETE FROM voto_avaliacoes WHERE avaliacao_id = $1`, id); erro != nil {
		return erro
	}

	resultado, erro := tx.Exec(
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

	return tx.Commit()
}

func scanAvaliacao(linha *sql.Row) (modelos.Avaliacao, error) {
	var avaliacao modelos.Avaliacao
	var templateID sql.NullInt64
	var score sql.NullFloat64
	var anexoURL sql.NullString

	erro := linha.Scan(
		&avaliacao.ID,
		&avaliacao.UsuarioID,
		&avaliacao.LivroID,
		&templateID,
		&avaliacao.Nota,
		&avaliacao.Texto,
		&avaliacao.ContemSpoiler,
		&anexoURL,
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
	if anexoURL.Valid {
		avaliacao.AnexoURL = &anexoURL.String
	}
	return avaliacao, nil
}

func scanAvaliacoes(linhas *sql.Rows) ([]modelos.Avaliacao, error) {
	avaliacoes := make([]modelos.Avaliacao, 0)
	for linhas.Next() {
		var avaliacao modelos.Avaliacao
		var templateID sql.NullInt64
		var score sql.NullFloat64
		var anexoURL sql.NullString

		if erro := linhas.Scan(
			&avaliacao.ID,
			&avaliacao.UsuarioID,
			&avaliacao.LivroID,
			&templateID,
			&avaliacao.Nota,
			&avaliacao.Texto,
			&avaliacao.ContemSpoiler,
			&anexoURL,
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
		if anexoURL.Valid {
			avaliacao.AnexoURL = &anexoURL.String
		}
		avaliacoes = append(avaliacoes, avaliacao)
	}
	return avaliacoes, nil
}

func aplicarUsuarioFeed(item *modelos.AvaliacaoFeed, status string, imageURL sql.NullString, assinaturaID uint64, assinaturaExpira sql.NullTime) {
	u := modelos.Usuario{AssinaturaID: assinaturaID}
	if assinaturaExpira.Valid {
		t := assinaturaExpira.Time
		u.AssinaturaExpiraEm = &t
	}
	item.Usuario.AssinaturaID = assinaturaID
	item.Usuario.TemPlanoTop = modelos.TemPlanoTop(u)
	item.Usuario.TemPlanoPro = modelos.TemPlanoPro(u)
	if imageURL.Valid {
		item.Usuario.Image = imageURL.String
	}
	if status == "inativo" {
		item.Usuario.Nome = "Conta apagada"
		item.Usuario.Nick = "conta_apagada"
		item.Usuario.Image = ""
		item.Usuario.AssinaturaID = 0
		item.Usuario.TemPlanoTop = false
		item.Usuario.TemPlanoPro = false
		item.Usuario.ContaApagada = true
	}
}
