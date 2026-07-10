package rotas

import (
	"backend/src/controllers"
	"net/http"
)

var rotasNotificacoes = []Rota{
	{
		URI:                "/notificacoes",
		Metodo:             http.MethodGet,
		Funcao:             controllers.BuscarNotificacoesNaoLidas,
		RequerAutenticacao: true,
	},
	{
		URI:                "/notificacoes/lidas",
		Metodo:             http.MethodPut,
		Funcao:             controllers.MarcarTodasNotificacoesComoLidas,
		RequerAutenticacao: true,
	},
	{
		URI:                "/notificacoes/{id}/ler",
		Metodo:             http.MethodPut,
		Funcao:             controllers.MarcarNotificacaoComoLida,
		RequerAutenticacao: true,
	},
}

var rotaWebSocket = Rota{
	URI:                "/ws",
	Metodo:             http.MethodGet,
	Funcao:             controllers.HandleWebSocket,
	RequerAutenticacao: false,
}
