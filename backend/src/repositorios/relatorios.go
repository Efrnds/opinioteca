package repositorios

import (
	"backend/src/modelos"
	"database/sql"
	"fmt"
	"strconv"
	"strings"
	"time"
)

type Relatorios struct {
	db *sql.DB
}

func NovoRepositorioDeRelatorios(db *sql.DB) *Relatorios {
	return &Relatorios{db}
}

func (repositorio Relatorios) ComentariosPorLivro(consulta string) ([]modelos.ComentarioRelatorioItem, error) {
	consulta = strings.TrimSpace(consulta)
	if consulta == "" {
		return nil, fmt.Errorf("consulta vazia")
	}

	query := `
		SELECT c.id, c.texto, c.criadoEm, u.nome, u.nick, l.titulo, cat.nome_categoria, c.avaliacao_id
		FROM comentarios c
		INNER JOIN usuarios u ON u.id = c.usuario_id
		INNER JOIN avaliacoes a ON a.id = c.avaliacao_id
		INNER JOIN livros l ON l.id = a.livro_id
		INNER JOIN categorias cat ON cat.id = l.categoria_id
		WHERE `

	args := []interface{}{}
	if id, erro := strconv.ParseUint(consulta, 10, 64); erro == nil {
		query += "l.id = $1"
		args = append(args, id)
	} else {
		query += "l.titulo ILIKE $1"
		args = append(args, "%"+consulta+"%")
	}

	query += " ORDER BY c.criadoEm DESC LIMIT 200"

	return repositorio.scanComentarios(query, args...)
}

func (repositorio Relatorios) ComentariosPorUsuario(consulta string) ([]modelos.ComentarioRelatorioItem, error) {
	consulta = strings.TrimSpace(consulta)
	if consulta == "" {
		return nil, fmt.Errorf("consulta vazia")
	}

	query := `
		SELECT c.id, c.texto, c.criadoEm, u.nome, u.nick, l.titulo, cat.nome_categoria, c.avaliacao_id
		FROM comentarios c
		INNER JOIN usuarios u ON u.id = c.usuario_id
		INNER JOIN avaliacoes a ON a.id = c.avaliacao_id
		INNER JOIN livros l ON l.id = a.livro_id
		INNER JOIN categorias cat ON cat.id = l.categoria_id
		WHERE `

	args := []interface{}{}
	if id, erro := strconv.ParseUint(consulta, 10, 64); erro == nil {
		query += "u.id = $1"
		args = append(args, id)
	} else if strings.Contains(consulta, "@") {
		query += "LOWER(u.email) = LOWER($1)"
		args = append(args, consulta)
	} else {
		query += "(LOWER(u.nick) = LOWER($1) OR u.nome ILIKE $2)"
		args = append(args, consulta, "%"+consulta+"%")
	}

	query += " ORDER BY c.criadoEm DESC LIMIT 200"

	return repositorio.scanComentarios(query, args...)
}

func (repositorio Relatorios) ComentariosPorCategoria(consulta string) ([]modelos.ComentarioRelatorioItem, error) {
	consulta = strings.TrimSpace(consulta)
	if consulta == "" {
		return nil, fmt.Errorf("consulta vazia")
	}

	query := `
		SELECT DISTINCT ON (c.id) c.id, c.texto, c.criadoEm, u.nome, u.nick, l.titulo, cat.nome_categoria, c.avaliacao_id
		FROM comentarios c
		INNER JOIN usuarios u ON u.id = c.usuario_id
		INNER JOIN avaliacoes a ON a.id = c.avaliacao_id
		INNER JOIN livros l ON l.id = a.livro_id
		INNER JOIN livro_categorias lc ON lc.livro_id = l.id
		INNER JOIN categorias cat ON cat.id = lc.categoria_id
		WHERE `

	args := []interface{}{}
	if id, erro := strconv.ParseUint(consulta, 10, 64); erro == nil {
		query += "lc.categoria_id = $1"
		args = append(args, id)
	} else {
		query += "cat.nome_categoria ILIKE $1"
		args = append(args, "%"+consulta+"%")
	}

	query += " ORDER BY c.id, c.criadoEm DESC LIMIT 200"

	return repositorio.scanComentarios(query, args...)
}

func (repositorio Relatorios) LivrosPorAutor(consulta string) ([]modelos.Livro, error) {
	consulta = strings.TrimSpace(consulta)
	if consulta == "" {
		return nil, fmt.Errorf("consulta vazia")
	}

	linhas, erro := repositorio.db.Query(
		selectLivro+` WHERE autor ILIKE $1 ORDER BY criadoEm DESC LIMIT 200`,
		"%"+consulta+"%",
	)
	if erro != nil {
		return nil, erro
	}
	defer linhas.Close()

	repoLivros := NovoRepositorioDeLivros(repositorio.db)
	livros := make([]modelos.Livro, 0)
	for linhas.Next() {
		livro, erro := repoLivros.scanLivro(linhas)
		if erro != nil {
			return nil, erro
		}
		livros = append(livros, livro)
	}
	return livros, nil
}

func (repositorio Relatorios) LivrosPorEditora(consulta string) ([]modelos.Livro, error) {
	consulta = strings.TrimSpace(consulta)
	if consulta == "" {
		return nil, fmt.Errorf("consulta vazia")
	}

	linhas, erro := repositorio.db.Query(
		selectLivro+` WHERE editora ILIKE $1 ORDER BY criadoEm DESC LIMIT 200`,
		"%"+consulta+"%",
	)
	if erro != nil {
		return nil, erro
	}
	defer linhas.Close()

	livros := make([]modelos.Livro, 0)
	for linhas.Next() {
		livro, erro := NovoRepositorioDeLivros(repositorio.db).scanLivro(linhas)
		if erro != nil {
			return nil, erro
		}
		livros = append(livros, livro)
	}
	return livros, nil
}

func (repositorio Relatorios) LivrosPorCategoria(consulta string) ([]modelos.Livro, error) {
	consulta = strings.TrimSpace(consulta)
	if consulta == "" {
		return nil, fmt.Errorf("consulta vazia")
	}

	query := `SELECT DISTINCT ON (livros.id) livros.id, livros.ISBN, livros.titulo, livros.editora, livros.categoria_id,
		livros.status, livros.paginas, livros.autor, livros.sinopse, livros.capa_url, livros.data_publicacao,
		livros.google_volume_id, livros.origem, livros.criadoEm
		FROM livros
		INNER JOIN livro_categorias lc ON lc.livro_id = livros.id
		INNER JOIN categorias cat ON cat.id = lc.categoria_id
		WHERE `
	args := []interface{}{}

	if id, erro := strconv.ParseUint(consulta, 10, 64); erro == nil {
		query += "lc.categoria_id = $1"
		args = append(args, id)
	} else {
		query += "cat.nome_categoria ILIKE $1"
		args = append(args, "%"+consulta+"%")
	}

	query += " ORDER BY livros.id, livros.criadoEm DESC LIMIT 200"

	linhas, erro := repositorio.db.Query(query, args...)
	if erro != nil {
		return nil, erro
	}
	defer linhas.Close()

	livros := make([]modelos.Livro, 0)
	for linhas.Next() {
		livro, erro := NovoRepositorioDeLivros(repositorio.db).scanLivro(linhas)
		if erro != nil {
			return nil, erro
		}
		livros = append(livros, livro)
	}
	return livros, nil
}

func (repositorio Relatorios) scanComentarios(query string, args ...interface{}) ([]modelos.ComentarioRelatorioItem, error) {
	linhas, erro := repositorio.db.Query(query, args...)
	if erro != nil {
		return nil, erro
	}
	defer linhas.Close()

	itens := make([]modelos.ComentarioRelatorioItem, 0)
	for linhas.Next() {
		var item modelos.ComentarioRelatorioItem
		if erro := linhas.Scan(
			&item.ID,
			&item.Texto,
			&item.CriadoEm,
			&item.UsuarioNome,
			&item.UsuarioNick,
			&item.LivroTitulo,
			&item.CategoriaNome,
			&item.AvaliacaoID,
		); erro != nil {
			return nil, erro
		}
		itens = append(itens, item)
	}
	return itens, nil
}

type FiltroPeriodo struct {
	De  *time.Time
	Ate *time.Time
}

func (repositorio Relatorios) RelatorioUsuarios(status, planoCodigo string, periodo FiltroPeriodo) (modelos.RelatorioUsuariosGeral, error) {
	var out modelos.RelatorioUsuariosGeral
	out.PorStatus = []modelos.ContagemRotulo{}
	out.PorPlano = []modelos.ContagemRotulo{}
	out.Usuarios = []modelos.UsuarioRelatorioItem{}

	linhasStatus, erro := repositorio.db.Query(`
		SELECT status, COUNT(*)::int FROM usuarios GROUP BY status ORDER BY status`)
	if erro != nil {
		return out, erro
	}
	defer linhasStatus.Close()
	for linhasStatus.Next() {
		var c modelos.ContagemRotulo
		if erro = linhasStatus.Scan(&c.Rotulo, &c.Total); erro != nil {
			return out, erro
		}
		out.PorStatus = append(out.PorStatus, c)
	}

	linhasPlano, erro := repositorio.db.Query(`
		SELECT a.nome, COUNT(*)::int
		FROM usuarios u
		INNER JOIN assinaturas a ON a.id = u.assinatura_id
		GROUP BY a.nome, a.nivel
		ORDER BY a.nivel`)
	if erro != nil {
		return out, erro
	}
	defer linhasPlano.Close()
	for linhasPlano.Next() {
		var c modelos.ContagemRotulo
		if erro = linhasPlano.Scan(&c.Rotulo, &c.Total); erro != nil {
			return out, erro
		}
		out.PorPlano = append(out.PorPlano, c)
	}

	condicoes := []string{"1=1"}
	args := []interface{}{}
	arg := 1
	if status != "" {
		condicoes = append(condicoes, fmt.Sprintf("u.status = $%d", arg))
		args = append(args, status)
		arg++
	}
	if planoCodigo != "" {
		condicoes = append(condicoes, fmt.Sprintf("a.codigo = $%d", arg))
		args = append(args, planoCodigo)
		arg++
	}
	if periodo.De != nil {
		condicoes = append(condicoes, fmt.Sprintf("u.criadoEm >= $%d", arg))
		args = append(args, *periodo.De)
		arg++
	}
	if periodo.Ate != nil {
		condicoes = append(condicoes, fmt.Sprintf("u.criadoEm < $%d", arg))
		args = append(args, periodo.Ate.Add(24*time.Hour))
		arg++
	}
	where := strings.Join(condicoes, " AND ")

	erro = repositorio.db.QueryRow(
		`SELECT COUNT(*)::int FROM usuarios u INNER JOIN assinaturas a ON a.id = u.assinatura_id WHERE `+where,
		args...,
	).Scan(&out.CriadosNoPeriodo)
	if erro != nil {
		return out, erro
	}
	out.Total = out.CriadosNoPeriodo

	linhas, erro := repositorio.db.Query(`
		SELECT u.id, u.nome, u.nick, u.email, u.status, a.codigo, a.nome, u.is_admin, u.criadoEm, u.assinatura_expira_em
		FROM usuarios u
		INNER JOIN assinaturas a ON a.id = u.assinatura_id
		WHERE `+where+`
		ORDER BY u.criadoEm DESC
		LIMIT 500`, args...)
	if erro != nil {
		return out, erro
	}
	defer linhas.Close()

	for linhas.Next() {
		var item modelos.UsuarioRelatorioItem
		var expira sql.NullTime
		if erro = linhas.Scan(
			&item.ID, &item.Nome, &item.Nick, &item.Email, &item.Status,
			&item.PlanoCodigo, &item.PlanoNome, &item.IsAdmin, &item.CriadoEm, &expira,
		); erro != nil {
			return out, erro
		}
		if expira.Valid {
			t := expira.Time
			item.ExpiraEm = &t
		}
		out.Usuarios = append(out.Usuarios, item)
	}
	return out, nil
}

func (repositorio Relatorios) RelatorioAvaliacoes(periodo FiltroPeriodo, spoiler string) (modelos.RelatorioAvaliacoesGeral, error) {
	var out modelos.RelatorioAvaliacoesGeral
	out.PorNota = []modelos.ContagemRotulo{}
	out.Avaliacoes = []modelos.AvaliacaoRelatorioItem{}

	condicoes := []string{"1=1"}
	args := []interface{}{}
	arg := 1
	if periodo.De != nil {
		condicoes = append(condicoes, fmt.Sprintf("a.criadoEm >= $%d", arg))
		args = append(args, *periodo.De)
		arg++
	}
	if periodo.Ate != nil {
		condicoes = append(condicoes, fmt.Sprintf("a.criadoEm < $%d", arg))
		args = append(args, periodo.Ate.Add(24*time.Hour))
		arg++
	}
	if spoiler == "sim" {
		condicoes = append(condicoes, "a.contem_spoiler = TRUE")
	} else if spoiler == "nao" {
		condicoes = append(condicoes, "a.contem_spoiler = FALSE")
	}
	where := strings.Join(condicoes, " AND ")

	erro := repositorio.db.QueryRow(`
		SELECT COUNT(*)::int,
		       COALESCE(AVG(a.nota), 0),
		       COUNT(*) FILTER (WHERE a.contem_spoiler)::int
		FROM avaliacoes a
		WHERE `+where, args...).Scan(&out.Total, &out.MediaNota, &out.ComSpoiler)
	if erro != nil {
		return out, erro
	}

	linhasNota, erro := repositorio.db.Query(`
		SELECT a.nota::text, COUNT(*)::int
		FROM avaliacoes a
		WHERE `+where+`
		GROUP BY a.nota
		ORDER BY a.nota`, args...)
	if erro != nil {
		return out, erro
	}
	defer linhasNota.Close()
	for linhasNota.Next() {
		var c modelos.ContagemRotulo
		if erro = linhasNota.Scan(&c.Rotulo, &c.Total); erro != nil {
			return out, erro
		}
		c.Rotulo = c.Rotulo + " estrela(s)"
		out.PorNota = append(out.PorNota, c)
	}

	linhas, erro := repositorio.db.Query(`
		SELECT a.id, a.nota, a.texto, a.contem_spoiler, u.nick, l.titulo, a.criadoEm
		FROM avaliacoes a
		INNER JOIN usuarios u ON u.id = a.usuario_id
		INNER JOIN livros l ON l.id = a.livro_id
		WHERE `+where+`
		ORDER BY a.criadoEm DESC
		LIMIT 500`, args...)
	if erro != nil {
		return out, erro
	}
	defer linhas.Close()

	for linhas.Next() {
		var item modelos.AvaliacaoRelatorioItem
		if erro = linhas.Scan(
			&item.ID, &item.Nota, &item.Texto, &item.ContemSpoiler,
			&item.UsuarioNick, &item.LivroTitulo, &item.CriadoEm,
		); erro != nil {
			return out, erro
		}
		out.Avaliacoes = append(out.Avaliacoes, item)
	}
	return out, nil
}

func (repositorio Relatorios) RelatorioAssinaturas(planoCodigo, filtro string) (modelos.RelatorioAssinaturasGeral, error) {
	var out modelos.RelatorioAssinaturasGeral
	out.PorPlano = []modelos.ContagemRotulo{}
	out.Itens = []modelos.AssinaturaRelatorioItem{}

	agora := time.Now()
	limiteExpirando := agora.Add(30 * 24 * time.Hour)

	linhasPlano, erro := repositorio.db.Query(`
		SELECT a.nome, COUNT(*)::int
		FROM usuarios u
		INNER JOIN assinaturas a ON a.id = u.assinatura_id
		WHERE u.assinatura_id > 1
		GROUP BY a.nome, a.nivel
		ORDER BY a.nivel`)
	if erro != nil {
		return out, erro
	}
	defer linhasPlano.Close()
	for linhasPlano.Next() {
		var c modelos.ContagemRotulo
		if erro = linhasPlano.Scan(&c.Rotulo, &c.Total); erro != nil {
			return out, erro
		}
		out.PorPlano = append(out.PorPlano, c)
	}

	_ = repositorio.db.QueryRow(`
		SELECT
			COUNT(*) FILTER (
				WHERE u.assinatura_id > 1 AND (u.assinatura_expira_em IS NULL OR u.assinatura_expira_em > $1)
			)::int,
			COUNT(*) FILTER (
				WHERE u.assinatura_id > 1 AND u.assinatura_expira_em IS NOT NULL
				  AND u.assinatura_expira_em > $1 AND u.assinatura_expira_em <= $2
			)::int,
			COUNT(*) FILTER (
				WHERE u.assinatura_id > 1 AND u.assinatura_expira_em IS NOT NULL AND u.assinatura_expira_em <= $1
			)::int
		FROM usuarios u`, agora, limiteExpirando,
	).Scan(&out.Ativas, &out.Expirando, &out.Expiradas)

	condicoes := []string{"u.assinatura_id > 1"}
	args := []interface{}{}
	arg := 1
	if planoCodigo != "" {
		condicoes = append(condicoes, fmt.Sprintf("a.codigo = $%d", arg))
		args = append(args, planoCodigo)
		arg++
	}
	switch filtro {
	case "ativas":
		condicoes = append(condicoes, fmt.Sprintf("(u.assinatura_expira_em IS NULL OR u.assinatura_expira_em > $%d)", arg))
		args = append(args, agora)
		arg++
	case "expirando":
		condicoes = append(condicoes, fmt.Sprintf("u.assinatura_expira_em IS NOT NULL AND u.assinatura_expira_em > $%d AND u.assinatura_expira_em <= $%d", arg, arg+1))
		args = append(args, agora, limiteExpirando)
		arg += 2
	case "expiradas":
		condicoes = append(condicoes, fmt.Sprintf("u.assinatura_expira_em IS NOT NULL AND u.assinatura_expira_em <= $%d", arg))
		args = append(args, agora)
		arg++
	}
	where := strings.Join(condicoes, " AND ")

	erro = repositorio.db.QueryRow(
		`SELECT COUNT(*)::int FROM usuarios u INNER JOIN assinaturas a ON a.id = u.assinatura_id WHERE `+where,
		args...,
	).Scan(&out.Total)
	if erro != nil {
		return out, erro
	}

	linhas, erro := repositorio.db.Query(`
		SELECT u.id, u.nome, u.nick, u.email, a.codigo, a.nome, u.assinatura_expira_em, u.status
		FROM usuarios u
		INNER JOIN assinaturas a ON a.id = u.assinatura_id
		WHERE `+where+`
		ORDER BY u.assinatura_expira_em NULLS FIRST, u.nick
		LIMIT 500`, args...)
	if erro != nil {
		return out, erro
	}
	defer linhas.Close()

	for linhas.Next() {
		var item modelos.AssinaturaRelatorioItem
		var expira sql.NullTime
		if erro = linhas.Scan(
			&item.ID, &item.Nome, &item.Nick, &item.Email,
			&item.PlanoCodigo, &item.PlanoNome, &expira, &item.Status,
		); erro != nil {
			return out, erro
		}
		if expira.Valid {
			t := expira.Time
			item.ExpiraEm = &t
		} else {
			item.Vitalicia = true
		}
		out.Itens = append(out.Itens, item)
	}
	return out, nil
}

func (repositorio Relatorios) RelatorioDenuncias(status, tipo string, periodo FiltroPeriodo) (modelos.RelatorioDenunciasGeral, error) {
	var out modelos.RelatorioDenunciasGeral
	out.PorStatus = []modelos.ContagemRotulo{}
	out.PorTipo = []modelos.ContagemRotulo{}
	out.Itens = []modelos.DenunciaRelatorioItem{}

	condicoes := []string{"1=1"}
	args := []interface{}{}
	arg := 1
	if status != "" {
		condicoes = append(condicoes, fmt.Sprintf("d.status = $%d", arg))
		args = append(args, status)
		arg++
	}
	if tipo != "" {
		condicoes = append(condicoes, fmt.Sprintf("d.tipo_entidade = $%d", arg))
		args = append(args, tipo)
		arg++
	}
	if periodo.De != nil {
		condicoes = append(condicoes, fmt.Sprintf("d.criadoEm >= $%d", arg))
		args = append(args, *periodo.De)
		arg++
	}
	if periodo.Ate != nil {
		condicoes = append(condicoes, fmt.Sprintf("d.criadoEm < $%d", arg))
		args = append(args, periodo.Ate.Add(24*time.Hour))
		arg++
	}
	where := strings.Join(condicoes, " AND ")

	erro := repositorio.db.QueryRow(
		`SELECT COUNT(*)::int FROM denuncias d WHERE `+where, args...,
	).Scan(&out.Total)
	if erro != nil {
		return out, erro
	}

	linhasStatus, erro := repositorio.db.Query(`
		SELECT d.status, COUNT(*)::int FROM denuncias d WHERE `+where+` GROUP BY d.status ORDER BY d.status`, args...)
	if erro != nil {
		return out, erro
	}
	defer linhasStatus.Close()
	for linhasStatus.Next() {
		var c modelos.ContagemRotulo
		if erro = linhasStatus.Scan(&c.Rotulo, &c.Total); erro != nil {
			return out, erro
		}
		out.PorStatus = append(out.PorStatus, c)
	}

	linhasTipo, erro := repositorio.db.Query(`
		SELECT d.tipo_entidade, COUNT(*)::int FROM denuncias d WHERE `+where+` GROUP BY d.tipo_entidade ORDER BY d.tipo_entidade`, args...)
	if erro != nil {
		return out, erro
	}
	defer linhasTipo.Close()
	for linhasTipo.Next() {
		var c modelos.ContagemRotulo
		if erro = linhasTipo.Scan(&c.Rotulo, &c.Total); erro != nil {
			return out, erro
		}
		out.PorTipo = append(out.PorTipo, c)
	}

	linhas, erro := repositorio.db.Query(`
		SELECT d.id, d.tipo_entidade, d.referencia_id, d.motivo, d.status, u.nick, d.criadoEm
		FROM denuncias d
		INNER JOIN usuarios u ON u.id = d.denunciante_id
		WHERE `+where+`
		ORDER BY d.criadoEm DESC
		LIMIT 500`, args...)
	if erro != nil {
		return out, erro
	}
	defer linhas.Close()

	for linhas.Next() {
		var item modelos.DenunciaRelatorioItem
		if erro = linhas.Scan(
			&item.ID, &item.TipoEntidade, &item.ReferenciaID, &item.Motivo,
			&item.Status, &item.DenuncianteNick, &item.CriadoEm,
		); erro != nil {
			return out, erro
		}
		out.Itens = append(out.Itens, item)
	}
	return out, nil
}
