package main

import (
	"backend/src/controller/router"
	"backend/src/utils/config"
	"fmt"
	"log"
	"net/http"
)

// Sobe a API: lê a configuração, monta as rotas e escuta a porta.
func main() {
	config.Carregar()
	r := router.Gerar()

	fmt.Println("Servidor rodando na porta", config.Porta)
	log.Fatal(http.ListenAndServe(fmt.Sprintf(":%d", config.Porta), r))
}
