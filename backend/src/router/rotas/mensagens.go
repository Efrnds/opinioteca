package rotas

import (
	"backend/src/controllers"
	"net/http"
)

var rotasMensagens = []Rota{
	{
		URI:                "/mensagens",
		Metodo:             http.MethodGet,
		Funcao:             controllers.BuscarInboxMensagens,
		RequerAutenticacao: true,
	},
	{
		URI:                "/mensagens/contagem-nao-lidas",
		Metodo:             http.MethodGet,
		Funcao:             controllers.ContarMensagensNaoLidas,
		RequerAutenticacao: true,
	},
	{
		URI:                "/mensagens/conversa/{outroId}",
		Metodo:             http.MethodDelete,
		Funcao:             controllers.ApagarConversaMensagens,
		RequerAutenticacao: true,
	},
	{
		URI:                "/mensagens/conversa/{id}/fixar",
		Metodo:             http.MethodPost,
		Funcao:             controllers.ToggleFixarConversa,
		RequerAutenticacao: true,
	},
	{
		URI:                "/mensagens/msg/{id}",
		Metodo:             http.MethodPut,
		Funcao:             controllers.EditarMensagem,
		RequerAutenticacao: true,
	},
	{
		URI:                "/mensagens/msg/{id}",
		Metodo:             http.MethodDelete,
		Funcao:             controllers.ApagarMensagem,
		RequerAutenticacao: true,
	},
	{
		URI:                "/mensagens/msg/{id}/reagir",
		Metodo:             http.MethodPut,
		Funcao:             controllers.ReagirMensagem,
		RequerAutenticacao: true,
	},
	{
		URI:                "/mensagens/msg/{id}/ler",
		Metodo:             http.MethodPut,
		Funcao:             controllers.MarcarMensagemComoLida,
		RequerAutenticacao: true,
	},
	{
		URI:                "/mensagens/{usuarioId}",
		Metodo:             http.MethodGet,
		Funcao:             controllers.BuscarHistoricoMensagens,
		RequerAutenticacao: true,
	},
	{
		URI:                "/mensagens/{usuarioId}",
		Metodo:             http.MethodPost,
		Funcao:             controllers.EnviarMensagem,
		RequerAutenticacao: true,
	},
}
