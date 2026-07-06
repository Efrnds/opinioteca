package controllers

import (
	"backend/src/auth"
	"backend/src/banco"
	"backend/src/modelos"
	"backend/src/repositorios"
	"backend/src/respostas"
	"backend/src/websockets"
	"database/sql"
	"errors"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
)

func HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	token := auth.ExtrairTokenDaRequisicao(r)
	usuarioID, erro := auth.ExtrairUsuarioIDDoToken(token)
	if erro != nil {
		respostas.Erro(w, http.StatusUnauthorized, erro)
		return
	}

	conn, erro := websockets.Upgrade(w, r)
	if erro != nil {
		return
	}

	websockets.Registrar(usuarioID, conn)
	defer func() {
		websockets.Remover(usuarioID)
		conn.Close()
	}()

	for {
		if _, _, erro := conn.ReadMessage(); erro != nil {
			break
		}
	}
}

func BuscarNotificacoesNaoLidas(w http.ResponseWriter, r *http.Request) {
	usuarioID, erro := auth.ExtrairUsuarioID(r)
	if erro != nil {
		respostas.Erro(w, http.StatusUnauthorized, erro)
		return
	}

	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	repo := repositorios.NovoRepositorioDeNotificacoes(db)

	var notificacoes []modelos.Notificacao
	if r.URL.Query().Get("todas") == "true" {
		notificacoes, erro = repo.BuscarTodas(usuarioID)
	} else {
		notificacoes, erro = repo.BuscarNaoLidas(usuarioID)
	}
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	if notificacoes == nil {
		notificacoes = []modelos.Notificacao{}
	}

	respostas.JSON(w, http.StatusOK, notificacoes)
}

func MarcarNotificacaoComoLida(w http.ResponseWriter, r *http.Request) {
	usuarioID, erro := auth.ExtrairUsuarioID(r)
	if erro != nil {
		respostas.Erro(w, http.StatusUnauthorized, erro)
		return
	}

	notificacaoID, erro := strconv.ParseUint(mux.Vars(r)["id"], 10, 64)
	if erro != nil || notificacaoID == 0 {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}

	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	repo := repositorios.NovoRepositorioDeNotificacoes(db)
	if erro = repo.MarcarComoLida(usuarioID, notificacaoID); erro != nil {
		if errors.Is(erro, sql.ErrNoRows) {
			respostas.Erro(w, http.StatusNotFound, errors.New("Notificação não encontrada"))
			return
		}
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	respostas.NoContent(w)
}
