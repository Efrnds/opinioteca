package rotas

import (
	"backend/src/controllers"
	"net/http"
)

var rotasPlanos = []Rota{
	{
		URI:                "/planos",
		Metodo:             http.MethodGet,
		Funcao:             controllers.ListarPlanos,
		RequerAutenticacao: false,
	},
	{
		URI:                "/usuarios/{nick}/plano",
		Metodo:             http.MethodGet,
		Funcao:             controllers.BuscarPlanoUsuario,
		RequerAutenticacao: true,
	},
	{
		URI:                "/admin/usuarios/{usuarioId}/assinatura",
		Metodo:             http.MethodPut,
		Funcao:             controllers.AdminAtribuirPlano,
		RequerAutenticacao: true,
		RequerAdmin:        true,
	},
	{
		URI:                "/admin/usuarios/{usuarioId}/assinatura",
		Metodo:             http.MethodDelete,
		Funcao:             controllers.AdminRevogarPlano,
		RequerAutenticacao: true,
		RequerAdmin:        true,
	},
}
