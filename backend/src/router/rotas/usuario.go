package rotas

import (
	"backend/src/controllers"
	"net/http"
)

// Rotas sociais de usuário — perfil acessado pelo nick (estilo Twitter).
var rotasUsuarios = []Rota{
	{
		URI:                "/usuarios",
		Metodo:             http.MethodPost,
		Funcao:             controllers.CriarUsuario,
		RequerAutenticacao: false,
	},
	{
		URI:                "/usuarios",
		Metodo:             http.MethodGet,
		Funcao:             controllers.BuscarUsuarios,
		RequerAutenticacao: true,
	},
	{
		URI:                "/usuarios/id/{usuarioId}",
		Metodo:             http.MethodGet,
		Funcao:             controllers.BuscarUsuarioPorID,
		RequerAutenticacao: true,
	},
	{
		URI:                "/usuarios/{nick}",
		Metodo:             http.MethodGet,
		Funcao:             controllers.BuscarUsuario,
		RequerAutenticacao: true,
	},
	{
		URI:                "/usuarios/{nick}",
		Metodo:             http.MethodPut,
		Funcao:             controllers.AtualizarUsuario,
		RequerAutenticacao: true,
	},
	{
		URI:                "/usuarios/{nick}",
		Metodo:             http.MethodDelete,
		Funcao:             controllers.InativarUsuario,
		RequerAutenticacao: true,
	},
	{
		URI:                "/usuarios/{nick}/seguir",
		Metodo:             http.MethodPost,
		Funcao:             controllers.SeguirUsuario,
		RequerAutenticacao: true,
	},
	{
		URI:                "/usuarios/{nick}/deixar-de-seguir",
		Metodo:             http.MethodPost,
		Funcao:             controllers.DeixarSeguirUsuario,
		RequerAutenticacao: true,
	},
	{
		URI:                "/usuarios/{nick}/seguidores",
		Metodo:             http.MethodGet,
		Funcao:             controllers.BuscarSeguidores,
		RequerAutenticacao: true,
	},
	{
		URI:                "/usuarios/{nick}/seguindo",
		Metodo:             http.MethodGet,
		Funcao:             controllers.BuscarSeguindo,
		RequerAutenticacao: true,
	},
	{
		URI:                "/usuarios/{nick}/avaliacoes",
		Metodo:             http.MethodGet,
		Funcao:             controllers.BuscarAvaliacoesPorUsuario,
		RequerAutenticacao: true,
	},
	{
		URI:                "/usuarios/{nick}/atualizar-senha",
		Metodo:             http.MethodPost,
		Funcao:             controllers.AtualizarSenha,
		RequerAutenticacao: true,
	},
}
