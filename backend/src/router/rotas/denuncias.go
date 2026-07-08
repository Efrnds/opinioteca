package rotas

import (
	"backend/src/controllers"
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
