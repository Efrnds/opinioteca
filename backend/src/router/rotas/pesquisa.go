package rotas

import (
	"backend/src/controllers"
	"net/http"
)

var rotasPesquisa = []Rota{
	{
		URI:                "/pesquisa",
		Metodo:             http.MethodGet,
		Funcao:             controllers.PesquisaGlobal,
		RequerAutenticacao: true,
	},
}
