package rotas

import (
	"backend/src/controllers"
	"net/http"
)

var rotasDescoberta = []Rota{
	{
		URI:                "/descoberta/livros/em-alta",
		Metodo:             http.MethodGet,
		Funcao:             controllers.DescobertaLivrosEmAlta,
		RequerAutenticacao: true,
	},
	{
		URI:                "/descoberta/livros/recentes",
		Metodo:             http.MethodGet,
		Funcao:             controllers.DescobertaLivrosRecentes,
		RequerAutenticacao: true,
	},
	{
		URI:                "/descoberta/usuarios/sugeridos",
		Metodo:             http.MethodGet,
		Funcao:             controllers.DescobertaUsuariosSugeridos,
		RequerAutenticacao: true,
	},
	{
		URI:                "/descoberta/usuarios/rank",
		Metodo:             http.MethodGet,
		Funcao:             controllers.DescobertaUsuariosPorRank,
		RequerAutenticacao: false,
	},
}
