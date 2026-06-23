package repositorios

import (
	"backend/src/modelos"
	"database/sql"
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
	if limite <= 0 {
		limite = 20
	}

	linhas, erro := repositorio.db.Query(
		`SELECT dl.id, dl.livro_id, dl.paginas_lidas, dl.porcentagem_leitura, dl.data_registro,
		        l.id, l.titulo, l.autor, COALESCE(l.capa_url, '')
		 FROM diario_leitura dl
		 INNER JOIN livros l ON l.id = dl.livro_id
		 WHERE dl.usuario_id = $1
		 ORDER BY dl.data_registro DESC
		 LIMIT $2`,
		usuarioID,
		limite,
	)
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

func (repositorio Diario) BuscarResumoLivros(usuarioID uint64) ([]modelos.DiarioLivroResumo, error) {
	linhas, erro := repositorio.db.Query(
		`WITH ultimos AS (
			SELECT DISTINCT ON (dl.livro_id)
			       dl.livro_id,
			       dl.porcentagem_leitura,
			       dl.data_registro
			FROM diario_leitura dl
			WHERE dl.usuario_id = $1
			ORDER BY dl.livro_id, dl.data_registro DESC
		),
		agregados AS (
			SELECT dl.livro_id,
			       COUNT(*) AS total_registros,
			       COALESCE(SUM(dl.paginas_lidas), 0) AS paginas_lidas
			FROM diario_leitura dl
			WHERE dl.usuario_id = $1
			GROUP BY dl.livro_id
		)
		SELECT l.id, l.titulo, l.autor, COALESCE(l.capa_url, ''),
		       u.porcentagem_leitura, u.data_registro,
		       a.total_registros, a.paginas_lidas
		FROM ultimos u
		INNER JOIN agregados a ON a.livro_id = u.livro_id
		INNER JOIN livros l ON l.id = u.livro_id
		ORDER BY u.data_registro DESC`,
		usuarioID,
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
