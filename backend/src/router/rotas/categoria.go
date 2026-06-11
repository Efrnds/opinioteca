package rotas

import (
	"backend/src/controllers"
	"net/http"
)

var rotasCategorias = []Rota{
	{
		URI:                "/categorias",
		Metodo:             http.MethodPost,
		Funcao:             controllers.CriarCategoria,
		RequerAutenticacao: true,
	},
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
	{
		URI:                "/categorias/{id}",
		Metodo:             http.MethodPut,
		Funcao:             controllers.AtualizarCategoria,
		RequerAutenticacao: true,
	},
	{
		URI:                "/categorias/{id}",
		Metodo:             http.MethodDelete,
		Funcao:             controllers.InativarCategoria,
		RequerAutenticacao: true,
	},
}
