package rotas

import (
	"backend/src/controllers"
	"net/http"
)

// Rotas admin — gestão de acervo e moderação (prefixo /admin).
var rotasAdmin = []Rota{
	{
		URI:                "/admin/usuarios",
		Metodo:             http.MethodGet,
		Funcao:             controllers.AdminBuscarUsuarios,
		RequerAutenticacao: true,
		RequerAdmin:        true,
	},
	{
		URI:                "/admin/usuarios",
		Metodo:             http.MethodPost,
		Funcao:             controllers.AdminCriarUsuario,
		RequerAutenticacao: true,
		RequerAdmin:        true,
	},
	{
		URI:                "/admin/usuarios/{usuarioId}",
		Metodo:             http.MethodGet,
		Funcao:             controllers.AdminBuscarUsuarioPorID,
		RequerAutenticacao: true,
		RequerAdmin:        true,
	},
	{
		URI:                "/admin/usuarios/{usuarioId}",
		Metodo:             http.MethodPut,
		Funcao:             controllers.AdminAtualizarUsuario,
		RequerAutenticacao: true,
		RequerAdmin:        true,
	},
	{
		URI:                "/admin/usuarios/{usuarioId}",
		Metodo:             http.MethodDelete,
		Funcao:             controllers.AdminInativarUsuario,
		RequerAutenticacao: true,
		RequerAdmin:        true,
	},
	{
		URI:                "/admin/livros",
		Metodo:             http.MethodGet,
		Funcao:             controllers.AdminListarLivros,
		RequerAutenticacao: true,
		RequerAdmin:        true,
	},
	{
		URI:                "/admin/livros",
		Metodo:             http.MethodPost,
		Funcao:             controllers.CriarLivro,
		RequerAutenticacao: true,
		RequerAdmin:        true,
	},
	{
		URI:                "/admin/livros/{id}",
		Metodo:             http.MethodGet,
		Funcao:             controllers.BuscarLivroPorID,
		RequerAutenticacao: true,
		RequerAdmin:        true,
	},
	{
		URI:                "/admin/livros/{id}",
		Metodo:             http.MethodPut,
		Funcao:             controllers.AtualizarLivro,
		RequerAutenticacao: true,
		RequerAdmin:        true,
	},
	{
		URI:                "/admin/livros/{id}",
		Metodo:             http.MethodDelete,
		Funcao:             controllers.InativarLivro,
		RequerAutenticacao: true,
		RequerAdmin:        true,
	},
	{
		URI:                "/admin/categorias",
		Metodo:             http.MethodGet,
		Funcao:             controllers.BuscarCategorias,
		RequerAutenticacao: true,
		RequerAdmin:        true,
	},
	{
		URI:                "/admin/categorias",
		Metodo:             http.MethodPost,
		Funcao:             controllers.CriarCategoria,
		RequerAutenticacao: true,
		RequerAdmin:        true,
	},
	{
		URI:                "/admin/categorias/{id}",
		Metodo:             http.MethodGet,
		Funcao:             controllers.BuscarCategoriaPorID,
		RequerAutenticacao: true,
		RequerAdmin:        true,
	},
	{
		URI:                "/admin/categorias/{id}",
		Metodo:             http.MethodPut,
		Funcao:             controllers.AtualizarCategoria,
		RequerAutenticacao: true,
		RequerAdmin:        true,
	},
	{
		URI:                "/admin/categorias/{id}",
		Metodo:             http.MethodDelete,
		Funcao:             controllers.InativarCategoria,
		RequerAutenticacao: true,
		RequerAdmin:        true,
	},
	{
		URI:                "/admin/relatorios/comentarios",
		Metodo:             http.MethodGet,
		Funcao:             controllers.AdminRelatorioComentarios,
		RequerAutenticacao: true,
		RequerAdmin:        true,
	},
	{
		URI:                "/admin/relatorios/livros",
		Metodo:             http.MethodGet,
		Funcao:             controllers.AdminRelatorioLivros,
		RequerAutenticacao: true,
		RequerAdmin:        true,
	},
	{
		URI:                "/admin/relatorios/seguidores-seguindo",
		Metodo:             http.MethodGet,
		Funcao:             controllers.AdminRelatorioSeguidoresSeguindo,
		RequerAutenticacao: true,
		RequerAdmin:        true,
	},
	{
		URI:                "/admin/relatorios/historico-leitura",
		Metodo:             http.MethodGet,
		Funcao:             controllers.AdminRelatorioHistoricoLeitura,
		RequerAutenticacao: true,
		RequerAdmin:        true,
	},
}
