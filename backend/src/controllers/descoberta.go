package controllers

import (
	"backend/src/auth"
	"backend/src/banco"
	"backend/src/repositorios"
	"backend/src/respostas"
	"net/http"
	"strconv"
)

func limiteDaQuery(r *http.Request, padrao int) int {
	limite := padrao
	if valor := r.URL.Query().Get("limite"); valor != "" {
		if parsed, erro := strconv.Atoi(valor); erro == nil && parsed > 0 && parsed <= 50 {
			limite = parsed
		}
	}
	return limite
}

func DescobertaLivrosEmAlta(w http.ResponseWriter, r *http.Request) {
	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	livros, erro := repositorios.NovoRepositorioDeDescoberta(db).LivrosEmAlta(limiteDaQuery(r, 12))
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	respostas.JSON(w, http.StatusOK, livros)
}

func DescobertaLivrosRecentes(w http.ResponseWriter, r *http.Request) {
	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	livros, erro := repositorios.NovoRepositorioDeDescoberta(db).LivrosRecentes(limiteDaQuery(r, 12))
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	respostas.JSON(w, http.StatusOK, livros)
}

func DescobertaUsuariosSugeridos(w http.ResponseWriter, r *http.Request) {
	viewerID, erro := auth.ExtrairUsuarioID(r)
	if erro != nil {
		respostas.Erro(w, http.StatusUnauthorized, erro)
		return
	}

	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	usuarios, erro := repositorios.NovoRepositorioDeDescoberta(db).UsuariosSugeridos(viewerID, limiteDaQuery(r, 12))
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	publicos := make([]any, 0, len(usuarios))
	for _, u := range usuarios {
		publicos = append(publicos, u.ListarPublico())
	}
	respostas.JSON(w, http.StatusOK, publicos)
}
