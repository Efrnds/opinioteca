package rotas

import (
	"backend/src/controller/controllers"
	"net/http"
)

var rotasDenuncias = []Rota{
	{
		URI:                "/denuncias",
		Metodo:             http.MethodPost,
		Funcao:             controllers.CriarDenuncia,
		RequerAutenticacao: true,
	},
}
