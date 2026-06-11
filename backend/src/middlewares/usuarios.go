package middlewares

import (
	"backend/src/auth"
	"backend/src/respostas"
	"errors"
	"net/http"
)

// VerificarAdmin é a função responsável por verificar se o usuário é admin.
func VerificarAdmin(proximaFuncao http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		usuarioID, erro := auth.ExtrairUsuarioID(r)
		if erro != nil {
			respostas.Erro(w, http.StatusUnauthorized, erro)
			return
		}
		if usuarioID != 1 {
			respostas.Erro(w, http.StatusForbidden, errors.New("Usuário não é admin"))
			return
		}
		proximaFuncao(w, r)
	}
}