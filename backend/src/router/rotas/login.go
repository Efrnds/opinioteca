package rotas

import (
	"backend/src/controllers"
	"net/http"
)

var rotaLogin = Rota{
	URI:                "/login",
	Metodo:             http.MethodPost,
	Funcao:             controllers.Login,
	RequerAutenticacao: false,
}

var rotaLoginGoogle = Rota{
	URI:                "/login/google",
	Metodo:             http.MethodPost,
	Funcao:             controllers.LoginGoogle,
	RequerAutenticacao: false,
}
