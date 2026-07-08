package rotas

import (
	"backend/src/controllers"
	"net/http"
)

var rotasDiario = []Rota{
	{
		URI:                "/diario",
		Metodo:             http.MethodPost,
		Funcao:             controllers.RegistrarDiario,
		RequerAutenticacao: true,
	},
	{
		URI:                "/diario/{nick}",
		Metodo:             http.MethodGet,
		Funcao:             controllers.BuscarDiario,
		RequerAutenticacao: true,
	},
	{
		URI:                "/diario/{nick}/historico",
		Metodo:             http.MethodGet,
		Funcao:             controllers.BuscarHistoricoDiario,
		RequerAutenticacao: true,
	},
	{
		URI:                "/diario/{nick}/estatisticas",
		Metodo:             http.MethodGet,
		Funcao:             controllers.BuscarEstatisticasLeitura,
		RequerAutenticacao: true,
	},
	{
		URI:                "/diario/{nick}/wrapped",
		Metodo:             http.MethodGet,
		Funcao:             controllers.BuscarOpinioWrapped,
		RequerAutenticacao: true,
	},
}
