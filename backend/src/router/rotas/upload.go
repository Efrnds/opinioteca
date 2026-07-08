package rotas

import (
	"backend/src/controllers"
	"net/http"
)

var rotaUploadAvatar = Rota{
	URI:                "/upload/avatar",
	Metodo:             http.MethodPost,
	Funcao:             controllers.UploadAvatar,
	RequerAutenticacao: true,
}
