package controllers

import (
	"backend/src/banco"
	"backend/src/repositorios"
	"backend/src/respostas"
	"database/sql"
	"errors"
	"net/http"
)

func BuscarCitacaoAleatoria(w http.ResponseWriter, r *http.Request) {
	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	citacao, erro := repositorios.NovoRepositorioDeCitacoes(db).BuscarAleatoria()
	if erro != nil {
		if errors.Is(erro, sql.ErrNoRows) {
			respostas.Erro(w, http.StatusNotFound, errors.New("Nenhuma citação encontrada"))
			return
		}
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	respostas.JSON(w, http.StatusOK, citacao)
}
