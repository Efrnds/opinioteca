package middlewares

import (
	"fmt"
	"log"
	"net/http"
	"backend/src/auth"
	"backend/src/respostas"
)

// Logger é a função responsável por registrar as informações de cada requisição recebida pela API, como o método HTTP e o caminho da URL, facilitando o monitoramento e a depuradação da aplicação.
func Logger(proximaFuncao http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		log.Printf("\n Requisição recebida: %s %s %s", r.Method, r.RequestURI, r.Host)
		proximaFuncao(w, r)
	}
}

func Autenticar(proximaFuncao http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if erro := auth.ValidarToken(r); erro != nil {
			respostas.Erro(w, http.StatusUnauthorized, erro)
			return
		}
		fmt.Println("Autenticando Usuário...")
		proximaFuncao(w, r)
	}
}
