package rotas

import (
	"backend/src/middlewares"
	"net/http"

	"github.com/gorilla/mux"
)

// Rota representa todas as rotas da API
type Rota struct {
	URI                string
	Metodo             string
	Funcao             func(http.ResponseWriter, *http.Request)
	RequerAutenticacao bool
	RequerAdmin        bool
}

func Configurar(r *mux.Router) *mux.Router {
	rotas := []Rota{}
	rotas = append(rotas, rotasUsuarios...)
	rotas = append(rotas, rotaLogin)
	rotas = append(rotas, rotaUploadAvatar)
	rotas = append(rotas, rotaUploadAnexo)
	rotas = append(rotas, rotaUploadBanner)
	rotas = append(rotas, rotasCategorias...)
	rotas = append(rotas, rotasLivros...)
	rotas = append(rotas, rotasAvaliacoes...)
	rotas = append(rotas, rotasDiario...)
	rotas = append(rotas, rotasPesquisa...)
	rotas = append(rotas, rotasMensagens...)
	rotas = append(rotas, rotasNotificacoes...)
	rotas = append(rotas, rotasCitacoes...)
	rotas = append(rotas, rotasDenuncias...)
	rotas = append(rotas, rotasDescoberta...)
	rotas = append(rotas, rotasPlanos...)
	rotas = append(rotas, rotasTemplates...)
	rotas = append(rotas, rotaWebSocket)
	rotas = append(rotas, rotasAdmin...)

	for _, rota := range rotas {
		handler := rota.Funcao

		if rota.RequerAdmin {
			handler = middlewares.VerificarAdmin(handler)
		}
		if rota.RequerAutenticacao {
			handler = middlewares.Autenticar(handler)
		}

		r.HandleFunc(rota.URI, middlewares.Logger(handler)).Methods(rota.Metodo)
	}

	return r
}
