package controllers

import (
	"backend/src/auth"
	"backend/src/banco"
	"backend/src/modelos"
	"backend/src/repositorios"
	"backend/src/respostas"
	"backend/src/security"
	"encoding/json"
	"errors"
	"io"
	"net/http"
)

// Login é a função responsável por autenticar um usuário e retornar um token de acesso.
func Login(w http.ResponseWriter, r *http.Request) {
	corpoRequisicao, erro := io.ReadAll(r.Body)
	if erro != nil {
		respostas.Erro(w, http.StatusUnprocessableEntity, erro)
		return
	}

	var usuario modelos.Usuario
	if erro = json.Unmarshal(corpoRequisicao, &usuario); erro != nil {
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
	usuarioSalvoNoBanco, erro := repositorio.BuscarPorEmail(usuario.Email)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	if erro = security.VerificarSenha(usuarioSalvoNoBanco.Senha, usuario.Senha); erro != nil {
		respostas.Erro(w, http.StatusUnauthorized, erro)
		return
	}

	if usuarioSalvoNoBanco.Status == "inativo" {
		respostas.Erro(w, http.StatusUnauthorized, errors.New("Usuário inativo ou não encontrado"))
		return
	}

	usuarioCompleto, erro := repositorio.BuscarPorID(usuarioSalvoNoBanco.ID)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	token, erro := auth.CriarToken(usuarioCompleto.ID, usuarioCompleto.Status, usuarioCompleto.IsAdmin)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	respostas.JSON(w, http.StatusOK, modelos.LoginResposta{
		Token:   token,
		IsAdmin: usuarioCompleto.IsAdmin,
		Usuario: usuarioCompleto.ListarPrivado(),
	})
}