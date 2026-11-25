package rotas

import (
	"backend/src/controller/controllers"
	"net/http"
)

var rotasCitacoes = []Rota{
	{
		URI:                "/citacoes/aleatoria",
		Metodo:             http.MethodGet,
		Funcao:             controllers.BuscarCitacaoAleatoria,
		RequerAutenticacao: false,
	},
}
