package rotas

import (
	"backend/src/controllers"
	"net/http"
)

var rotasCategorias = []Rota{
	{
		URI:                "/categorias",
		Metodo:             http.MethodGet,
		Funcao:             controllers.BuscarCategorias,
		RequerAutenticacao: true,
	},
	{
		URI:                "/categorias/{id}",
		Metodo:             http.MethodGet,
		Funcao:             controllers.BuscarCategoriaPorID,
		RequerAutenticacao: true,
	},
}
