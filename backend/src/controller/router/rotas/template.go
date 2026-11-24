package rotas

import (
	"backend/src/controller/controllers"
	"net/http"
)

var rotasTemplates = []Rota{
	{
		URI:                "/templates",
		Metodo:             http.MethodGet,
		Funcao:             controllers.ListarTemplatesAvaliacao,
		RequerAutenticacao: false,
	},
}
