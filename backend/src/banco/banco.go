package banco

import (
	"backend/src/config"
	"database/sql"
	_ "github.com/jackc/pgx/v5/stdlib"
)

// Conectar abre uma conexão com o banco de dados e retorna a instância do sql.DB
func Conectar() (*sql.DB, error) {
	db, erro := sql.Open("pgx", config.StringConexaoBanco)
	if erro != nil {
		return nil, erro
	}

	if erro = db.Ping(); erro != nil {
		db.Close()
		return nil, erro
	}

	return db, nil
}