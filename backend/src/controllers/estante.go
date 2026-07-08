package controllers

import (
	"backend/src/auth"
	"backend/src/banco"
	"backend/src/modelos"
	"backend/src/repositorios"
	"backend/src/respostas"
	"database/sql"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
)

func BuscarEstante(w http.ResponseWriter, r *http.Request) {
	nick := mux.Vars(r)["nick"]

	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	repoUsuarios := repositorios.NovoRepositorioDeUsuarios(db)
	usuario, erro := repoUsuarios.BuscarPorNick(nick)
	if erro != nil || usuario.ID == 0 {
		respostas.Erro(w, http.StatusNotFound, errors.New("Usuário não encontrado"))
		return
	}

	viewerID := auth.ExtrairUsuarioIDOpcional(r)
	ehDono := viewerID != 0 && viewerID == usuario.ID
	config, _ := repositorios.NovoRepositorioDeConfiguracoes(db).BuscarOuCriar(usuario.ID)
	segue, _ := repoUsuarios.Segue(viewerID, usuario.ID)

	if config.VisibilidadePerfil == modelos.VisibilidadePrivado && !ehDono && !segue {
		respostas.Erro(w, http.StatusForbidden, errors.New("Este perfil é privado"))
		return
	}
	if !modelos.PermiteAcesso(config.HistoricoVisivelPara, ehDono, segue) {
		respostas.Erro(w, http.StatusForbidden, errors.New("Estante de livros privada"))
		return
	}

	repoEstante := repositorios.NovoRepositorioDeEstante(db)
	itens, erro := repoEstante.Listar(usuario.ID)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	respostas.JSON(w, http.StatusOK, modelos.EstanteResposta{Livros: itens})
}

func AdicionarEstante(w http.ResponseWriter, r *http.Request) {
	nick := mux.Vars(r)["nick"]

	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	repoUsuarios := repositorios.NovoRepositorioDeUsuarios(db)
	usuario, erro := repoUsuarios.BuscarPorNick(nick)
	if erro != nil || usuario.ID == 0 {
		respostas.Erro(w, http.StatusNotFound, errors.New("Usuário não encontrado"))
		return
	}

	viewerID, erro := auth.ExtrairUsuarioID(r)
	if erro != nil || viewerID != usuario.ID {
		respostas.Erro(w, http.StatusUnauthorized, errors.New("Acesso negado"))
		return
	}

	corpo, erro := io.ReadAll(r.Body)
	if erro != nil {
		respostas.Erro(w, http.StatusUnprocessableEntity, erro)
		return
	}

	var req modelos.AdicionarEstanteRequest
	if erro = json.Unmarshal(corpo, &req); erro != nil {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}
	if erro = req.Preparar(); erro != nil {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}

	repoLivros := repositorios.NovoRepositorioDeLivros(db)
	if _, erro = repoLivros.BuscarPorID(req.LivroID); erro == sql.ErrNoRows {
		respostas.Erro(w, http.StatusNotFound, errors.New("Livro não encontrado"))
		return
	}
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	repoEstante := repositorios.NovoRepositorioDeEstante(db)
	if erro = repoEstante.Adicionar(usuario.ID, req.LivroID, req.Status); erro == sql.ErrNoRows {
		respostas.Erro(w, http.StatusServiceUnavailable, errors.New("Migration pendente: execute backend/sql/migrations/20260708_producao.sql"))
		return
	}
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	itens, erro := repoEstante.Listar(usuario.ID)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	respostas.JSON(w, http.StatusCreated, modelos.EstanteResposta{Livros: itens})
}

func AtualizarEstante(w http.ResponseWriter, r *http.Request) {
	nick := mux.Vars(r)["nick"]
	livroIDStr := mux.Vars(r)["livroId"]
	livroID, erro := strconv.ParseUint(livroIDStr, 10, 64)
	if erro != nil || livroID == 0 {
		respostas.Erro(w, http.StatusBadRequest, errors.New("livroId inválido"))
		return
	}

	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	repoUsuarios := repositorios.NovoRepositorioDeUsuarios(db)
	usuario, erro := repoUsuarios.BuscarPorNick(nick)
	if erro != nil || usuario.ID == 0 {
		respostas.Erro(w, http.StatusNotFound, errors.New("Usuário não encontrado"))
		return
	}

	viewerID, erro := auth.ExtrairUsuarioID(r)
	if erro != nil || viewerID != usuario.ID {
		respostas.Erro(w, http.StatusUnauthorized, errors.New("Acesso negado"))
		return
	}

	corpo, erro := io.ReadAll(r.Body)
	if erro != nil {
		respostas.Erro(w, http.StatusUnprocessableEntity, erro)
		return
	}

	var req modelos.AtualizarEstanteRequest
	if erro = json.Unmarshal(corpo, &req); erro != nil {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}
	if erro = req.Preparar(); erro != nil {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}

	repoEstante := repositorios.NovoRepositorioDeEstante(db)
	if erro = repoEstante.AtualizarStatus(usuario.ID, livroID, req.Status); erro == sql.ErrNoRows {
		respostas.Erro(w, http.StatusNotFound, errors.New("Livro não está na estante"))
		return
	}
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	itens, erro := repoEstante.Listar(usuario.ID)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	respostas.JSON(w, http.StatusOK, modelos.EstanteResposta{Livros: itens})
}

func RemoverEstante(w http.ResponseWriter, r *http.Request) {
	nick := mux.Vars(r)["nick"]
	livroIDStr := mux.Vars(r)["livroId"]
	livroID, erro := strconv.ParseUint(livroIDStr, 10, 64)
	if erro != nil || livroID == 0 {
		respostas.Erro(w, http.StatusBadRequest, errors.New("livroId inválido"))
		return
	}

	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	repoUsuarios := repositorios.NovoRepositorioDeUsuarios(db)
	usuario, erro := repoUsuarios.BuscarPorNick(nick)
	if erro != nil || usuario.ID == 0 {
		respostas.Erro(w, http.StatusNotFound, errors.New("Usuário não encontrado"))
		return
	}

	viewerID, erro := auth.ExtrairUsuarioID(r)
	if erro != nil || viewerID != usuario.ID {
		respostas.Erro(w, http.StatusUnauthorized, errors.New("Acesso negado"))
		return
	}

	repoEstante := repositorios.NovoRepositorioDeEstante(db)
	if erro = repoEstante.Remover(usuario.ID, livroID); erro == sql.ErrNoRows {
		respostas.Erro(w, http.StatusNotFound, errors.New("Livro não está na estante"))
		return
	}
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	respostas.JSON(w, http.StatusOK, map[string]bool{"removido": true})
}
