package rotas

import (
	"backend/src/controllers"
	"net/http"
)

var rotasRecuperarSenha = []Rota{
	{
		URI:                "/recuperar-senha/solicitar",
		Metodo:             http.MethodPost,
		Funcao:             controllers.SolicitarRecuperacaoSenha,
		RequerAutenticacao: false,
	},
	{
		URI:                "/recuperar-senha/verificar",
		Metodo:             http.MethodPost,
		Funcao:             controllers.VerificarCodigoRecuperacao,
		RequerAutenticacao: false,
	},
	{
		URI:                "/recuperar-senha/redefinir",
		Metodo:             http.MethodPost,
		Funcao:             controllers.RedefinirSenhaComCodigo,
		RequerAutenticacao: false,
	},
}
