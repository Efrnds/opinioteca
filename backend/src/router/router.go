package router

import (
	"backend/src/config"
	"backend/src/router/rotas"
	"net/http"

	"github.com/gorilla/mux"
)

func Gerar() *mux.Router {
	r := mux.NewRouter()

	r.PathPrefix("/uploads/").Handler(
		http.StripPrefix("/uploads/", http.FileServer(http.Dir(config.UploadsDir))),
	)

	return rotas.Configurar(r)
}