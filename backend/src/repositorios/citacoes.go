package repositorios

import (
	"backend/src/modelos"
	"database/sql"
)

type Citacoes struct {
	db *sql.DB
}

func NovoRepositorioDeCitacoes(db *sql.DB) *Citacoes {
	return &Citacoes{db}
}

func (repositorio Citacoes) BuscarAleatoria() (modelos.Citacao, error) {
	var citacao modelos.Citacao
	erro := repositorio.db.QueryRow(
		`SELECT id, texto, autor FROM citacoes ORDER BY RANDOM() LIMIT 1`,
	).Scan(&citacao.ID, &citacao.Texto, &citacao.Autor)
	return citacao, erro
}
