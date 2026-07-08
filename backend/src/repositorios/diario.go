package repositorios

import (
	"backend/src/modelos"
	"database/sql"
	"strconv"
	"time"
)

const timezoneDiario = "America/Sao_Paulo"

type Diario struct {
	db *sql.DB
}

func NovoRepositorioDeDiario(db *sql.DB) *Diario {
	return &Diario{db}
}

func (repositorio Diario) Registrar(tx *sql.Tx, registro modelos.DiarioLeitura) (uint64, error) {
	var id uint64
	erro := tx.QueryRow(
		`INSERT INTO diario_leitura (usuario_id, livro_id, paginas_lidas, porcentagem_leitura)
		 VALUES ($1, $2, $3, $4) RETURNING id`,
		registro.UsuarioID,
		registro.LivroID,
		registro.PaginasLidas,
		registro.PorcentagemLeitura,
	).Scan(&id)
	return id, erro
}

func (repositorio Diario) BuscarUltimoDiaLeitura(usuarioID uint64) (*time.Time, error) {
	var ultimo sql.NullString
	erro := repositorio.db.QueryRow(
		`SELECT TO_CHAR(MAX((data_registro AT TIME ZONE 'America/Sao_Paulo')::date), 'YYYY-MM-DD')
		 FROM diario_leitura
		 WHERE usuario_id = $1`,
		usuarioID,
	).Scan(&ultimo)
	if erro != nil {
		return nil, erro
	}
	if !ultimo.Valid {
		return nil, nil
	}
	local, erro := time.LoadLocation(timezoneDiario)
	if erro != nil {
		return nil, erro
	}
	t, erro := time.ParseInLocation("2006-01-02", ultimo.String, local)
	if erro != nil {
		return nil, erro
	}
	return &t, nil
}

func (repositorio Diario) JaLeuHoje(usuarioID uint64, hoje time.Time) (bool, error) {
	local, erro := time.LoadLocation(timezoneDiario)
	if erro != nil {
		return false, erro
	}
	diaLocal := hoje.In(local).Format("2006-01-02")

	var existe bool
	erro = repositorio.db.QueryRow(
		`SELECT EXISTS(
			SELECT 1 FROM diario_leitura
			WHERE usuario_id = $1
			  AND (data_registro AT TIME ZONE 'America/Sao_Paulo')::date = $2::date
		)`,
		usuarioID,
		diaLocal,
	).Scan(&existe)
	return existe, erro
}

func (repositorio Diario) BuscarDiasDaSemana(usuarioID uint64, inicio, fim time.Time) (map[string]bool, error) {
	local, erro := time.LoadLocation(timezoneDiario)
	if erro != nil {
		return nil, erro
	}
	inicioLocal := inicio.In(local).Format("2006-01-02")
	fimLocal := fim.In(local).Format("2006-01-02")

	linhas, erro := repositorio.db.Query(
		`SELECT DISTINCT TO_CHAR((data_registro AT TIME ZONE 'America/Sao_Paulo')::date, 'YYYY-MM-DD')
		 FROM diario_leitura
		 WHERE usuario_id = $1
		   AND (data_registro AT TIME ZONE 'America/Sao_Paulo')::date >= $2::date
		   AND (data_registro AT TIME ZONE 'America/Sao_Paulo')::date <= $3::date`,
		usuarioID,
		inicioLocal,
		fimLocal,
	)
	if erro != nil {
		return nil, erro
	}
	defer linhas.Close()

	dias := make(map[string]bool)
	for linhas.Next() {
		var dia string
		if erro := linhas.Scan(&dia); erro != nil {
			return nil, erro
		}
		dias[dia] = true
	}
	return dias, nil
}

func (repositorio Diario) BuscarHistorico(usuarioID uint64, limite int) ([]modelos.DiarioHistoricoItem, error) {
	return repositorio.BuscarHistoricoDesde(usuarioID, limite, time.Time{})
}

func (repositorio Diario) BuscarHistoricoDesde(usuarioID uint64, limite int, desde time.Time) ([]modelos.DiarioHistoricoItem, error) {
	if limite <= 0 {
		limite = 20
	}

	query := `SELECT dl.id, dl.livro_id, dl.paginas_lidas, dl.porcentagem_leitura, dl.data_registro,
		        l.id, l.titulo, l.autor, COALESCE(l.capa_url, '')
		 FROM diario_leitura dl
		 INNER JOIN livros l ON l.id = dl.livro_id
		 WHERE dl.usuario_id = $1`
	args := []any{usuarioID}
	argIndex := 2

	if !desde.IsZero() {
		query += ` AND (dl.data_registro AT TIME ZONE 'America/Sao_Paulo')::date >= $2::date`
		args = append(args, desde.In(mustLocationDiario()).Format("2006-01-02"))
		argIndex++
	}

	query += ` ORDER BY dl.data_registro DESC LIMIT $` + strconv.Itoa(argIndex)
	args = append(args, limite)

	linhas, erro := repositorio.db.Query(query, args...)
	if erro != nil {
		return nil, erro
	}
	defer linhas.Close()

	historico := make([]modelos.DiarioHistoricoItem, 0)
	for linhas.Next() {
		var item modelos.DiarioHistoricoItem
		if erro := linhas.Scan(
			&item.ID,
			&item.LivroID,
			&item.PaginasLidas,
			&item.PorcentagemLeitura,
			&item.DataRegistro,
			&item.Livro.ID,
			&item.Livro.Titulo,
			&item.Livro.Autor,
			&item.Livro.CapaURL,
		); erro != nil {
			return nil, erro
		}
		historico = append(historico, item)
	}
	return historico, nil
}

func mustLocationDiario() *time.Location {
	local, erro := time.LoadLocation(timezoneDiario)
	if erro != nil {
		return time.UTC
	}
	return local
}

func (repositorio Diario) BuscarResumoLivros(usuarioID uint64) ([]modelos.DiarioLivroResumo, error) {
	return repositorio.BuscarResumoLivrosDesde(usuarioID, time.Time{})
}

func (repositorio Diario) BuscarResumoLivrosDesde(usuarioID uint64, desde time.Time) ([]modelos.DiarioLivroResumo, error) {
	filtroData := ""
	args := []any{usuarioID}
	if !desde.IsZero() {
		filtroData = ` AND (dl.data_registro AT TIME ZONE 'America/Sao_Paulo')::date >= $2::date`
		args = append(args, desde.In(mustLocationDiario()).Format("2006-01-02"))
	}

	linhas, erro := repositorio.db.Query(
		`WITH ultimos AS (
			SELECT DISTINCT ON (dl.livro_id)
			       dl.livro_id,
			       dl.porcentagem_leitura,
			       dl.data_registro
			FROM diario_leitura dl
			WHERE dl.usuario_id = $1`+filtroData+`
			ORDER BY dl.livro_id, dl.data_registro DESC
		),
		agregados AS (
			SELECT dl.livro_id,
			       COUNT(*) AS total_registros,
			       COALESCE(SUM(dl.paginas_lidas), 0) AS paginas_lidas
			FROM diario_leitura dl
			WHERE dl.usuario_id = $1`+filtroData+`
			GROUP BY dl.livro_id
		)
		SELECT l.id, l.titulo, l.autor, COALESCE(l.capa_url, ''),
		       u.porcentagem_leitura, u.data_registro,
		       a.total_registros, a.paginas_lidas
		FROM ultimos u
		INNER JOIN agregados a ON a.livro_id = u.livro_id
		INNER JOIN livros l ON l.id = u.livro_id
		ORDER BY u.data_registro DESC`,
		args...,
	)
	if erro != nil {
		return nil, erro
	}
	defer linhas.Close()

	resumo := make([]modelos.DiarioLivroResumo, 0)
	for linhas.Next() {
		var item modelos.DiarioLivroResumo
		if erro := linhas.Scan(
			&item.Livro.ID,
			&item.Livro.Titulo,
			&item.Livro.Autor,
			&item.Livro.CapaURL,
			&item.PorcentagemAtual,
			&item.UltimaLeituraEm,
			&item.TotalRegistros,
			&item.PaginasLidas,
		); erro != nil {
			return nil, erro
		}
		resumo = append(resumo, item)
	}
	return resumo, nil
}

func (repositorio Diario) BuscarEstatisticasMensais(usuarioID uint64, inicioMes time.Time) (modelos.EstatisticasLeituraResposta, error) {
	local := mustLocationDiario()
	inicio := time.Date(inicioMes.Year(), inicioMes.Month(), 1, 0, 0, 0, 0, local)
	fim := inicio.AddDate(0, 1, 0)
	inicioStr := inicio.Format("2006-01-02")
	fimStr := fim.Format("2006-01-02")

	var stats modelos.EstatisticasLeituraResposta
	stats.Disponivel = true
	stats.MesReferencia = inicio.Format("2006-01")

	erro := repositorio.db.QueryRow(
		`SELECT
			COALESCE(SUM(paginas_lidas), 0),
			COUNT(DISTINCT (data_registro AT TIME ZONE 'America/Sao_Paulo')::date),
			COUNT(*)
		 FROM diario_leitura
		 WHERE usuario_id = $1
		   AND (data_registro AT TIME ZONE 'America/Sao_Paulo')::date >= $2::date
		   AND (data_registro AT TIME ZONE 'America/Sao_Paulo')::date < $3::date`,
		usuarioID,
		inicioStr,
		fimStr,
	).Scan(&stats.PaginasLidasMes, &stats.DiasComLeitura, &stats.RegistrosMes)
	if erro != nil {
		return modelos.EstatisticasLeituraResposta{}, erro
	}

	erro = repositorio.db.QueryRow(
		`SELECT COUNT(DISTINCT livro_id) FROM (
			SELECT livro_id FROM diario_leitura
			WHERE usuario_id = $1
			  AND porcentagem_leitura >= 100
			  AND (data_registro AT TIME ZONE 'America/Sao_Paulo')::date >= $2::date
			  AND (data_registro AT TIME ZONE 'America/Sao_Paulo')::date < $3::date
			UNION
			SELECT livro_id FROM avaliacoes
			WHERE usuario_id = $1
			  AND (criadoEm AT TIME ZONE 'America/Sao_Paulo')::date >= $2::date
			  AND (criadoEm AT TIME ZONE 'America/Sao_Paulo')::date < $3::date
		) AS finalizados`,
		usuarioID,
		inicioStr,
		fimStr,
	).Scan(&stats.LivrosFinalizados)
	if erro != nil {
		return modelos.EstatisticasLeituraResposta{}, erro
	}

	erro = repositorio.db.QueryRow(
		`SELECT COUNT(DISTINCT livro_id)
		 FROM diario_leitura
		 WHERE usuario_id = $1
		   AND porcentagem_leitura > 0 AND porcentagem_leitura < 100`,
		usuarioID,
	).Scan(&stats.TotalLivrosAtivos)
	if erro != nil {
		return modelos.EstatisticasLeituraResposta{}, erro
	}

	return stats, nil
}

func (repositorio Diario) BuscarOpinioWrapped(usuarioID uint64, maiorSequencia, sequenciaAtual int) (modelos.OpinioWrappedResposta, error) {
	local := mustLocationDiario()
	agora := time.Now().In(local)
	inicio := agora.AddDate(-1, 0, 0)
	inicioStr := inicio.Format("2006-01-02")
	fimStr := agora.Format("2006-01-02")

	var resp modelos.OpinioWrappedResposta
	resp.Disponivel = true
	resp.PeriodoInicio = inicioStr
	resp.PeriodoFim = fimStr
	resp.MaiorSequencia = maiorSequencia
	resp.SequenciaAtual = sequenciaAtual

	erro := repositorio.db.QueryRow(
		`SELECT
			COALESCE(SUM(paginas_lidas), 0),
			COUNT(DISTINCT (data_registro AT TIME ZONE 'America/Sao_Paulo')::date),
			COUNT(*)
		 FROM diario_leitura
		 WHERE usuario_id = $1
		   AND (data_registro AT TIME ZONE 'America/Sao_Paulo')::date >= $2::date
		   AND (data_registro AT TIME ZONE 'America/Sao_Paulo')::date <= $3::date`,
		usuarioID, inicioStr, fimStr,
	).Scan(&resp.PaginasLidas, &resp.DiasComLeitura, &resp.Registros)
	if erro != nil {
		return modelos.OpinioWrappedResposta{}, erro
	}
	resp.PaginasRegistradas = resp.PaginasLidas

	// Regra anti-dupla contagem do Wrapped:
	// - todo livro concluído dentro da janela de 12 meses entra no resumo;
	// - para cada livro concluído, usamos o maior valor entre as páginas
	//   registradas no diário dentro da janela e o total canônico de páginas do livro;
	// - para livros não concluídos, contamos só as páginas do diário.
	// Assim, o resumo continua fiel quando há poucos registros sem inflar quem já
	// registrou muitas páginas do mesmo livro no diário.
	linhasResumo, erro := repositorio.db.Query(
		`WITH diario_periodo AS (
			SELECT
				dl.livro_id,
				COALESCE(SUM(dl.paginas_lidas), 0) AS paginas_diario,
				MAX(CASE WHEN dl.porcentagem_leitura >= 100 THEN 1 ELSE 0 END) AS concluiu_no_diario
			FROM diario_leitura dl
			WHERE dl.usuario_id = $1
			  AND (dl.data_registro AT TIME ZONE 'America/Sao_Paulo')::date >= $2::date
			  AND (dl.data_registro AT TIME ZONE 'America/Sao_Paulo')::date <= $3::date
			GROUP BY dl.livro_id
		),
		avaliacoes_periodo AS (
			SELECT a.livro_id, 1 AS concluiu_em_avaliacao
			FROM avaliacoes a
			WHERE a.usuario_id = $1
			  AND (a.criadoEm AT TIME ZONE 'America/Sao_Paulo')::date >= $2::date
			  AND (a.criadoEm AT TIME ZONE 'America/Sao_Paulo')::date <= $3::date
			GROUP BY a.livro_id
		),
		livros_periodo AS (
			SELECT
				COALESCE(d.livro_id, a.livro_id) AS livro_id,
				COALESCE(d.paginas_diario, 0) AS paginas_diario,
				(COALESCE(d.concluiu_no_diario, 0) = 1 OR COALESCE(a.concluiu_em_avaliacao, 0) = 1) AS concluido
			FROM diario_periodo d
			FULL OUTER JOIN avaliacoes_periodo a ON a.livro_id = d.livro_id
		)
		SELECT
			lp.livro_id,
			lp.paginas_diario,
			lp.concluido,
			COALESCE(l.paginas, 0) AS paginas_livro
		FROM livros_periodo lp
		INNER JOIN livros l ON l.id = lp.livro_id`,
		usuarioID, inicioStr, fimStr,
	)
	if erro != nil {
		return modelos.OpinioWrappedResposta{}, erro
	}
	defer linhasResumo.Close()

	paginasTotais := 0
	paginasEstimadasConcluidas := 0
	livrosFinalizados := 0
	for linhasResumo.Next() {
		var livroID uint64
		var paginasDiario, paginasLivro int
		var concluido bool
		if erro := linhasResumo.Scan(&livroID, &paginasDiario, &concluido, &paginasLivro); erro != nil {
			return modelos.OpinioWrappedResposta{}, erro
		}

		contribuicao := paginasDiario
		if concluido {
			livrosFinalizados++
			if paginasLivro > contribuicao {
				paginasEstimadasConcluidas += paginasLivro - contribuicao
				contribuicao = paginasLivro
			}
		}
		paginasTotais += contribuicao
	}
	if erro := linhasResumo.Err(); erro != nil {
		return modelos.OpinioWrappedResposta{}, erro
	}

	resp.LivrosFinalizados = livrosFinalizados
	resp.PaginasEstimadasConcluidas = paginasEstimadasConcluidas
	resp.PaginasLidas = paginasTotais

	linhasMes, erro := repositorio.db.Query(
		`SELECT TO_CHAR((data_registro AT TIME ZONE 'America/Sao_Paulo')::date, 'YYYY-MM') AS mes,
		        SUM(paginas_lidas) AS paginas
		 FROM diario_leitura
		 WHERE usuario_id = $1
		   AND (data_registro AT TIME ZONE 'America/Sao_Paulo')::date >= $2::date
		 GROUP BY mes
		 ORDER BY paginas DESC
		 LIMIT 1`,
		usuarioID, inicioStr,
	)
	if erro == nil {
		defer linhasMes.Close()
		if linhasMes.Next() {
			var mes string
			_ = linhasMes.Scan(&mes, &resp.PaginasMesAtivo)
			resp.MesMaisAtivo = mes
		}
	}

	linhasGenero, erro := repositorio.db.Query(
		`SELECT c.nome_categoria, COUNT(DISTINCT atividade.livro_id) AS total
		 FROM (
			SELECT livro_id FROM diario_leitura
			WHERE usuario_id = $1
			  AND (data_registro AT TIME ZONE 'America/Sao_Paulo')::date >= $2::date
			  AND (data_registro AT TIME ZONE 'America/Sao_Paulo')::date <= $3::date
			UNION
			SELECT livro_id FROM avaliacoes
			WHERE usuario_id = $1
			  AND (criadoEm AT TIME ZONE 'America/Sao_Paulo')::date >= $2::date
			  AND (criadoEm AT TIME ZONE 'America/Sao_Paulo')::date <= $3::date
		 ) AS atividade
		 INNER JOIN (
			SELECT livro_id, categoria_id FROM livro_categorias
			UNION
			SELECT l.id, l.categoria_id FROM livros l
			WHERE l.categoria_id IS NOT NULL
			  AND NOT EXISTS (SELECT 1 FROM livro_categorias lc WHERE lc.livro_id = l.id)
		 ) AS lc ON lc.livro_id = atividade.livro_id
		 INNER JOIN categorias c ON c.id = lc.categoria_id AND c.ativo = true
		 GROUP BY c.id, c.nome_categoria
		 ORDER BY total DESC, c.nome_categoria ASC
		 LIMIT 3`,
		usuarioID, inicioStr, fimStr,
	)
	if erro == nil {
		defer linhasGenero.Close()
		resp.GenerosFavoritos = make([]modelos.GeneroWrapped, 0)
		for linhasGenero.Next() {
			var g modelos.GeneroWrapped
			if erro := linhasGenero.Scan(&g.Nome, &g.Total); erro == nil {
				resp.GenerosFavoritos = append(resp.GenerosFavoritos, g)
			}
		}
		if len(resp.GenerosFavoritos) > 0 {
			resp.GeneroFavorito = resp.GenerosFavoritos[0].Nome
		}
	}

	var destaque modelos.LivroWrappedDestaque
	erro = repositorio.db.QueryRow(
		`SELECT l.titulo, l.autor, COALESCE(l.capa_url, '')
		 FROM diario_leitura dl
		 INNER JOIN livros l ON l.id = dl.livro_id
		 WHERE dl.usuario_id = $1
		   AND (dl.data_registro AT TIME ZONE 'America/Sao_Paulo')::date >= $2::date
		 GROUP BY l.id, l.titulo, l.autor, l.capa_url
		 ORDER BY SUM(dl.paginas_lidas) DESC
		 LIMIT 1`,
		usuarioID, inicioStr,
	).Scan(&destaque.Titulo, &destaque.Autor, &destaque.CapaURL)
	if erro == sql.ErrNoRows || destaque.Titulo == "" {
		_ = repositorio.db.QueryRow(
			`SELECT l.titulo, l.autor, COALESCE(l.capa_url, '')
			 FROM avaliacoes a
			 INNER JOIN livros l ON l.id = a.livro_id
			 WHERE a.usuario_id = $1
			   AND (a.criadoEm AT TIME ZONE 'America/Sao_Paulo')::date >= $2::date
			 ORDER BY a.criadoEm DESC
			 LIMIT 1`,
			usuarioID, inicioStr,
		).Scan(&destaque.Titulo, &destaque.Autor, &destaque.CapaURL)
	}
	resp.LivroDestaque = destaque.Titulo
	if destaque.Titulo != "" {
		resp.LivroDestaqueDetalhe = &destaque
	}

	return resp, nil
}
