package controllers

import (
	"backend/src/model/banco"
	"backend/src/model/modelos"
	"backend/src/model/repositorios"
	"backend/src/utils/auth"
	"backend/src/utils/respostas"
	"backend/src/utils/websockets"
	"database/sql"
	"errors"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
)

// Autentica o JWT, promove a conexão e registra o usuário no hub até o socket cair.
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
		websockets.RemoverConn(usuarioID, conn)
		conn.Close()
	}()

	for {
		if _, _, erro := conn.ReadMessage(); erro != nil {
			break
		}
	}
}

// paginacaoNotificacoes: notificacoes nas notificações.
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

// Busca notificacoes nao lidas nas notificações.
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

// Marca notificacao como lida nas notificações.
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

// Marca todas notificacoes como lidas nas notificações.
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
