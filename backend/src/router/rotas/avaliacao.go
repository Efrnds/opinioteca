package rotas

import (
	"backend/src/controllers"
	"net/http"
)

var rotasAvaliacoes = []Rota{
	{
		URI:                "/avaliacoes",
		Metodo:             http.MethodPost,
		Funcao:             controllers.CriarAvaliacao,
		RequerAutenticacao: true,
	},
	{
		URI:                "/avaliacoes/{id}/voto",
		Metodo:             http.MethodPost,
		Funcao:             controllers.VotarAvaliacao,
		RequerAutenticacao: true,
	},
	{
		URI:                "/avaliacoes/{id}/voto",
		Metodo:             http.MethodDelete,
		Funcao:             controllers.RemoverVotoAvaliacao,
		RequerAutenticacao: true,
	},
	{
		URI:                "/avaliacoes/{id}",
		Metodo:             http.MethodGet,
		Funcao:             controllers.BuscarAvaliacaoPorID,
		RequerAutenticacao: true,
	},
	{
		URI:                "/avaliacoes/{id}",
		Metodo:             http.MethodPut,
		Funcao:             controllers.AtualizarAvaliacao,
		RequerAutenticacao: true,
	},
	{
		URI:                "/avaliacoes/{id}",
		Metodo:             http.MethodDelete,
		Funcao:             controllers.DeletarAvaliacao,
		RequerAutenticacao: true,
	},
}
