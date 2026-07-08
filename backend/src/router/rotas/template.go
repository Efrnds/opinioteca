package rotas

import (
	"backend/src/controllers"
	"net/http"
)

var rotasTemplates = []Rota{
	{
		URI:                "/templates",
		Metodo:             http.MethodGet,
		Funcao:             controllers.ListarTemplatesResenha,
		RequerAutenticacao: false,
	},
}
