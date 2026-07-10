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
	token, protocolEcho := auth.ExtrairTokenWebSocket(r)
	usuarioID, erro := auth.ExtrairUsuarioIDDoToken(token)
	if erro != nil {
		respostas.Erro(w, http.StatusUnauthorized, erro)
		return
	}

	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	usuario, erro := repositorios.NovoRepositorioDeUsuarios(db).BuscarPorID(usuarioID)
	db.Close()
	if erro != nil || usuario.ID == 0 || usuario.Status != "ativo" {
		respostas.Erro(w, http.StatusUnauthorized, errors.New("Conta inativa ou inválida"))
		return
	}

	var hdr http.Header
	if protocolEcho != "" {
		hdr = http.Header{"Sec-WebSocket-Protocol": []string{protocolEcho}}
	}

	conn, erro := websockets.Upgrade(w, r, hdr)
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

func paginacaoNotificacoes(r *http.Request) (limite, offset int) {
	if valor := r.URL.Query().Get("limite"); valor != "" {
		if parsed, erro := strconv.Atoi(valor); erro == nil && parsed > 0 {
			limite = parsed
		}
	}
	if valor := r.URL.Query().Get("offset"); valor != "" {
		if parsed, erro := strconv.Atoi(valor); erro == nil && parsed >= 0 {
			offset = parsed
		}
	}
	return limite, offset
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
	limite, offset := paginacaoNotificacoes(r)

	var notificacoes []modelos.Notificacao
	if r.URL.Query().Get("todas") == "true" {
		notificacoes, erro = repo.BuscarTodas(usuarioID, limite, offset)
	} else {
		notificacoes, erro = repo.BuscarNaoLidas(usuarioID, limite, offset)
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

func MarcarTodasNotificacoesComoLidas(w http.ResponseWriter, r *http.Request) {
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
	if erro = repo.MarcarTodasComoLidas(usuarioID); erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	respostas.NoContent(w)
}
