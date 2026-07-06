package rotas

import (
	"backend/src/controllers"
	"net/http"
)

var rotasLivros = []Rota{
	{
		URI:                "/livros/buscar",
		Metodo:             http.MethodGet,
		Funcao:             controllers.BuscarLivrosUnificado,
		RequerAutenticacao: true,
	},
	{
		URI:                "/livros/google/{volumeId}",
		Metodo:             http.MethodGet,
		Funcao:             controllers.BuscarLivroPorGoogleVolume,
		RequerAutenticacao: true,
	},
	{
		URI:                "/livros",
		Metodo:             http.MethodPost,
		Funcao:             controllers.CriarLivroUsuario,
		RequerAutenticacao: true,
	},
	{
		URI:                "/livros/{id}",
		Metodo:             http.MethodGet,
		Funcao:             controllers.BuscarLivroPorID,
		RequerAutenticacao: true,
	},
	{
		URI:                "/livros/{livroId}/avaliacoes",
		Metodo:             http.MethodGet,
		Funcao:             controllers.BuscarAvaliacoesPorLivro,
		RequerAutenticacao: true,
	},
}
