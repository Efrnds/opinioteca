package rotas

import (
	"backend/src/controllers"
	"net/http"
)

// Rotas sociais de usuário: perfil acessado pelo nick (estilo Twitter).
var rotasUsuarios = []Rota{
	{
		URI:                "/usuarios",
		Metodo:             http.MethodPost,
		Funcao:             controllers.CriarUsuario,
		RequerAutenticacao: false,
	},
	{
		URI:                "/usuarios/reativar",
		Metodo:             http.MethodPost,
		Funcao:             controllers.ReativarUsuario,
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
		URI:                "/usuarios/{nick}/configuracoes",
		Metodo:             http.MethodGet,
		Funcao:             controllers.BuscarConfiguracoes,
		RequerAutenticacao: true,
	},
	{
		URI:                "/usuarios/{nick}/configuracoes",
		Metodo:             http.MethodPut,
		Funcao:             controllers.AtualizarConfiguracoes,
		RequerAutenticacao: true,
	},
	{
		URI:                "/usuarios/{nick}",
		Metodo:             http.MethodGet,
		Funcao:             controllers.BuscarUsuario,
		RequerAutenticacao: false,
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
		RequerAutenticacao: false,
	},
	{
		URI:                "/usuarios/{nick}/atualizar-senha",
		Metodo:             http.MethodPost,
		Funcao:             controllers.AtualizarSenha,
		RequerAutenticacao: true,
	},
	{
		URI:                "/usuarios/{nick}/modo-zen",
		Metodo:             http.MethodPut,
		Funcao:             controllers.AtualizarModoZen,
		RequerAutenticacao: true,
	},
	{
		URI:                "/usuarios/{nick}/meta-leitura",
		Metodo:             http.MethodGet,
		Funcao:             controllers.BuscarMetaLeitura,
		RequerAutenticacao: true,
	},
	{
		URI:                "/usuarios/{nick}/meta-leitura",
		Metodo:             http.MethodPut,
		Funcao:             controllers.SalvarMetaLeitura,
		RequerAutenticacao: true,
	},
	{
		URI:                "/usuarios/{nick}/estante",
		Metodo:             http.MethodGet,
		Funcao:             controllers.BuscarEstante,
		RequerAutenticacao: true,
	},
	{
		URI:                "/usuarios/{nick}/estante",
		Metodo:             http.MethodPost,
		Funcao:             controllers.AdicionarEstante,
		RequerAutenticacao: true,
	},
	{
		URI:                "/usuarios/{nick}/estante/{livroId}",
		Metodo:             http.MethodPut,
		Funcao:             controllers.AtualizarEstante,
		RequerAutenticacao: true,
	},
	{
		URI:                "/usuarios/{nick}/estante/{livroId}",
		Metodo:             http.MethodDelete,
		Funcao:             controllers.RemoverEstante,
		RequerAutenticacao: true,
	},
}
