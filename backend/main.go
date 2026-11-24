package main

import (
	"backend/src/utils/config"
	"backend/src/controller/router"
	"fmt"
	"log"
	"net/http"
)

func main() {
	config.Carregar()
	r := router.Gerar()

	fmt.Println("Servidor rodando na porta", config.Porta)
	log.Fatal(http.ListenAndServe(fmt.Sprintf(":%d", config.Porta), r))
}
