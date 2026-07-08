package repositorios

import (
	"backend/src/modelos"
	"database/sql"
	"time"
)

type MetaLeitura struct {
	db *sql.DB
}

func NovoRepositorioDeMetaLeitura(db *sql.DB) *MetaLeitura {
	return &MetaLeitura{db}
}

func (repositorio MetaLeitura) schemaExiste() bool {
	var existe bool
	erro := repositorio.db.QueryRow(`
		SELECT EXISTS (
			SELECT 1 FROM information_schema.tables
			WHERE table_schema = current_schema() AND table_name = 'usuario_meta_leitura'
		)`).Scan(&existe)
	return erro == nil && existe
}

func (repositorio MetaLeitura) Buscar(usuarioID uint64) (modelos.MetaLeitura, bool, error) {
	if !repositorio.schemaExiste() {
		return modelos.MetaLeitura{}, false, nil
	}

	var meta modelos.MetaLeitura
	erro := repositorio.db.QueryRow(
		`SELECT tipo, periodo, meta FROM usuario_meta_leitura WHERE usuario_id = $1`,
		usuarioID,
	).Scan(&meta.Tipo, &meta.Periodo, &meta.Meta)
	if erro == sql.ErrNoRows {
		return modelos.MetaLeitura{}, false, nil
	}
	if erro != nil {
		return modelos.MetaLeitura{}, false, erro
	}
	return meta, true, nil
}

func (repositorio MetaLeitura) Salvar(usuarioID uint64, req modelos.MetaLeituraRequest) error {
	if !repositorio.schemaExiste() {
		return sql.ErrNoRows
	}

	_, erro := repositorio.db.Exec(
		`INSERT INTO usuario_meta_leitura (usuario_id, tipo, periodo, meta, atualizado_em)
		 VALUES ($1, $2, $3, $4, NOW())
		 ON CONFLICT (usuario_id) DO UPDATE SET
		   tipo = EXCLUDED.tipo,
		   periodo = EXCLUDED.periodo,
		   meta = EXCLUDED.meta,
		   atualizado_em = NOW()`,
		usuarioID, req.Tipo, req.Periodo, req.Meta,
	)
	return erro
}

func (repositorio MetaLeitura) Remover(usuarioID uint64) error {
	if !repositorio.schemaExiste() {
		return nil
	}
	_, erro := repositorio.db.Exec(`DELETE FROM usuario_meta_leitura WHERE usuario_id = $1`, usuarioID)
	return erro
}

func (repositorio Diario) CalcularProgressoMeta(usuarioID uint64, tipo, periodo string) (int, error) {
	local := mustLocationDiario()
	agora := time.Now().In(local)
	var inicio time.Time
	if periodo == "anual" {
		inicio = time.Date(agora.Year(), 1, 1, 0, 0, 0, 0, local)
	} else {
		inicio = time.Date(agora.Year(), agora.Month(), 1, 0, 0, 0, 0, local)
	}
	inicioStr := inicio.Format("2006-01-02")

	if tipo == "livros" {
		var total int
		erro := repositorio.db.QueryRow(
			`SELECT COUNT(DISTINCT livro_id)
			 FROM diario_leitura
			 WHERE usuario_id = $1
			   AND porcentagem_leitura >= 100
			   AND (data_registro AT TIME ZONE 'America/Sao_Paulo')::date >= $2::date`,
			usuarioID, inicioStr,
		).Scan(&total)
		return total, erro
	}

	var paginas int
	erro := repositorio.db.QueryRow(
		`SELECT COALESCE(SUM(paginas_lidas), 0)
		 FROM diario_leitura
		 WHERE usuario_id = $1
		   AND (data_registro AT TIME ZONE 'America/Sao_Paulo')::date >= $2::date`,
		usuarioID, inicioStr,
	).Scan(&paginas)
	return paginas, erro
}
