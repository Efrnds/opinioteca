package rotas

import (
	"backend/src/controllers"
	"net/http"
)

var rotasLivros = []Rota{
	{
		URI:                "/livros",
		Metodo:             http.MethodPost,
		Funcao:             controllers.CriarLivro,
		RequerAutenticacao: true,
	},
	{
		URI:                "/livros",
		Metodo:             http.MethodGet,
		Funcao:             controllers.BuscarLivros,
		RequerAutenticacao: true,
	},
	{
		URI:                "/livros/{id}",
		Metodo:             http.MethodGet,
		Funcao:             controllers.BuscarLivroPorID,
		RequerAutenticacao: true,
	},
	{
		URI:                "/livros/{id}",
		Metodo:             http.MethodPut,
		Funcao:             controllers.AtualizarLivro,
		RequerAutenticacao: true,
	},
	{
		URI:                "/livros/{id}",
		Metodo:             http.MethodDelete,
		Funcao:             controllers.InativarLivro,
		RequerAutenticacao: true,
	},
	{
		URI:                "/livros/autor/{autor}",
		Metodo:             http.MethodGet,
		Funcao:             controllers.BuscarLivrosPorAutor,
		RequerAutenticacao: true,
	},
	{
		URI:                "/livros/categoria/{categoriaId}",
		Metodo:             http.MethodGet,
		Funcao:             controllers.BuscarLivrosPorCategoria,
		RequerAutenticacao: true,
	},
	{
		URI:                "/livros/editora/{editora}",
		Metodo:             http.MethodGet,
		Funcao:             controllers.BuscarLivrosPorEditora,
		RequerAutenticacao: true,
	},
	{
		URI:                "/livros/isbn/{isbn}",
		Metodo:             http.MethodGet,
		Funcao:             controllers.BuscarLivrosPorISBN,
		RequerAutenticacao: true,
	},
	{
		URI:                "/livros/titulo/{titulo}",
		Metodo:             http.MethodGet,
		Funcao:             controllers.BuscarLivrosPorTitulo,
		RequerAutenticacao: true,
	},
}