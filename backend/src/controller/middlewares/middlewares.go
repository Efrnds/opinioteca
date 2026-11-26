package middlewares

import (
	"backend/src/model/banco"
	"backend/src/model/repositorios"
	"backend/src/utils/auth"
	"backend/src/utils/respostas"
	"errors"
	"log"
	"net/http"
	"strings"
)

// caminhoLogSeguro: log seguro.
func caminhoLogSeguro(r *http.Request) string {
	u := *r.URL
	q := u.Query()
	if q.Has("token") {
		q.Set("token", "[redacted]")
		u.RawQuery = q.Encode()
	}
	path := u.RequestURI()
	if path == "" {
		path = u.Path
	}
	return path
}

// Anota método e caminho da request e esconde o token se ele vier na URL.
func Logger(proximaFuncao http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		log.Printf("\n Requisição recebida: %s %s %s", r.Method, caminhoLogSeguro(r), r.Host)
		proximaFuncao(w, r)
	}
}

// Exige JWT válido e conta ativa antes de deixar o handler rodar.
func Autenticar(proximaFuncao http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if erro := auth.ValidarToken(r); erro != nil {
			respostas.Erro(w, http.StatusUnauthorized, erro)
			return
		}

		usuarioID, erro := auth.ExtrairUsuarioID(r)
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

		usuario, erro := repositorios.NovoRepositorioDeUsuarios(db).BuscarPorID(usuarioID)
		if erro != nil || usuario.ID == 0 {
			respostas.Erro(w, http.StatusUnauthorized, errors.New("Usuário não encontrado"))
			return
		}
		if !strings.EqualFold(usuario.Status, "ativo") {
			respostas.Erro(w, http.StatusUnauthorized, errors.New("Conta inativa"))
			return
		}

		proximaFuncao(w, r)
	}
}
