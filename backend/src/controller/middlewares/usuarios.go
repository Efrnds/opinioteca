package middlewares

import (
	"backend/src/model/banco"
	"backend/src/model/repositorios"
	"backend/src/utils/auth"
	"backend/src/utils/respostas"
	"errors"
	"net/http"
)

// Confere admin no cadastro de usuários.
func VerificarAdmin(proximaFuncao http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
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

		repositorio := repositorios.NovoRepositorioDeUsuarios(db)
		isAdmin, erro := repositorio.IsAdmin(usuarioID)
		if erro != nil {
			respostas.Erro(w, http.StatusInternalServerError, erro)
			return
		}
		if !isAdmin {
			respostas.Erro(w, http.StatusForbidden, errors.New("Usuário não é admin"))
			return
		}

		proximaFuncao(w, r)
	}
}
