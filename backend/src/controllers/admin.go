package controllers

import (
	"backend/src/banco"
	"backend/src/modelos"
	"backend/src/repositorios"
	"backend/src/respostas"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
	"github.com/jackc/pgx/v5/pgconn"
)

func usuarioIDDaURL(r *http.Request) (uint64, error) {
	return strconv.ParseUint(mux.Vars(r)["usuarioId"], 10, 64)
}

// AdminBuscarUsuarios lista todos os usuários (moderação).
func AdminBuscarUsuarios(w http.ResponseWriter, r *http.Request) {
	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	repositorio := repositorios.NovoRepositorioDeUsuarios(db)
	usuarios, erro := repositorio.BuscarTodos()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	resposta := make([]modelos.UsuarioAdmin, 0, len(usuarios))
	for _, usuario := range usuarios {
		resposta = append(resposta, usuario.ListarAdmin())
	}

	respostas.JSON(w, http.StatusOK, resposta)
}

// AdminBuscarUsuarioPorID retorna um usuário pelo ID com dados completos.
func AdminBuscarUsuarioPorID(w http.ResponseWriter, r *http.Request) {
	usuarioID, erro := usuarioIDDaURL(r)
	if erro != nil {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}

	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	repositorio := repositorios.NovoRepositorioDeUsuarios(db)
	usuario, erro := repositorio.BuscarPorID(usuarioID)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	if usuario.ID == 0 {
		respostas.Erro(w, http.StatusNotFound, errors.New("Usuário não encontrado"))
		return
	}

	respostas.JSON(w, http.StatusOK, usuario.ListarAdmin())
}

// AdminCriarUsuario cadastra um novo usuário (admin).
func AdminCriarUsuario(w http.ResponseWriter, r *http.Request) {
	corpo, erro := io.ReadAll(r.Body)
	if erro != nil {
		respostas.Erro(w, http.StatusUnprocessableEntity, erro)
		return
	}

	var payload struct {
		modelos.Usuario
		IsAdmin bool `json:"isAdmin"`
	}
	if erro = json.Unmarshal(corpo, &payload); erro != nil {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}

	if erro = payload.Usuario.Preparar("cadastro"); erro != nil {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}

	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	repositorio := repositorios.NovoRepositorioDeUsuarios(db)
	payload.Usuario.ID, erro = repositorio.CriarAdmin(payload.Usuario, payload.IsAdmin)
	if erro != nil {
		var pgErro *pgconn.PgError
		if errors.As(erro, &pgErro) && pgErro.Code == "23505" {
			respostas.Erro(w, http.StatusConflict, erro)
			return
		}
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	payload.Usuario.IsAdmin = payload.IsAdmin
	payload.Usuario.Status = "ativo"
	respostas.JSON(w, http.StatusCreated, payload.Usuario.ListarAdmin())
}

// AdminAtualizarUsuario atualiza qualquer usuário (perfil, status, isAdmin).
func AdminAtualizarUsuario(w http.ResponseWriter, r *http.Request) {
	usuarioID, erro := usuarioIDDaURL(r)
	if erro != nil {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}

	corpo, erro := io.ReadAll(r.Body)
	if erro != nil {
		respostas.Erro(w, http.StatusUnprocessableEntity, erro)
		return
	}

	var payload struct {
		Nome    string `json:"nome"`
		Nick    string `json:"nick"`
		Email   string `json:"email"`
		Status  string `json:"status"`
		IsAdmin *bool  `json:"isAdmin"`
	}
	if erro = json.Unmarshal(corpo, &payload); erro != nil {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}

	if payload.Status != "" && payload.Status != "ativo" && payload.Status != "inativo" {
		respostas.Erro(w, http.StatusBadRequest, errors.New("Status deve ser 'ativo' ou 'inativo'"))
		return
	}

	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	repositorio := repositorios.NovoRepositorioDeUsuarios(db)
	usuario, erro := repositorio.BuscarPorID(usuarioID)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	if usuario.ID == 0 {
		respostas.Erro(w, http.StatusNotFound, errors.New("Usuário não encontrado"))
		return
	}

	if payload.Nome != "" {
		usuario.Nome = payload.Nome
	}
	if payload.Nick != "" {
		usuario.Nick = payload.Nick
	}
	if payload.Email != "" {
		usuario.Email = payload.Email
	}
	if payload.Status != "" {
		usuario.Status = payload.Status
	}
	if payload.IsAdmin != nil {
		usuario.IsAdmin = *payload.IsAdmin
	}

	if erro = usuario.Preparar("edicao"); erro != nil {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}

	if erro = repositorio.AtualizarAdmin(usuarioID, usuario); erro != nil {
		var pgErro *pgconn.PgError
		if errors.As(erro, &pgErro) && pgErro.Code == "23505" {
			respostas.Erro(w, http.StatusConflict, erro)
			return
		}
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	respostas.NoContent(w)
}

// AdminInativarUsuario inativa qualquer conta pelo ID.
func AdminInativarUsuario(w http.ResponseWriter, r *http.Request) {
	usuarioID, erro := usuarioIDDaURL(r)
	if erro != nil {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}

	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	repositorio := repositorios.NovoRepositorioDeUsuarios(db)
	usuario, erro := repositorio.BuscarPorID(usuarioID)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	if usuario.ID == 0 {
		respostas.Erro(w, http.StatusNotFound, errors.New("Usuário não encontrado"))
		return
	}

	if erro = repositorio.Inativar(usuarioID); erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	respostas.NoContent(w)
}
