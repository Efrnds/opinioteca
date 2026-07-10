package controllers

import (
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

// BuscarConfiguracoes retorna as preferências do próprio usuário.
func BuscarConfiguracoes(w http.ResponseWriter, r *http.Request) {
	nick := nickDaURL(r)

	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	repoUsuarios := repositorios.NovoRepositorioDeUsuarios(db)
	usuarioToken, erro := usuarioDoToken(r, repoUsuarios)
	if erro != nil {
		respostas.Erro(w, http.StatusUnauthorized, erro)
		return
	}
	if !ehProprioPerfil(usuarioToken, nick) {
		respostas.Erro(w, http.StatusForbidden, errors.New("Só é possível ver as próprias configurações"))
		return
	}

	config, erro := repositorios.NovoRepositorioDeConfiguracoes(db).BuscarOuCriar(usuarioToken.ID)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	if !modelos.TemPlanoPro(usuarioToken) {
		config = modelos.SanitizarAparenciaSemPro(config)
	}

	respostas.JSON(w, http.StatusOK, config)
}

// AtualizarConfiguracoes atualiza as preferências do próprio usuário.
func AtualizarConfiguracoes(w http.ResponseWriter, r *http.Request) {
	nick := nickDaURL(r)

	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	repoUsuarios := repositorios.NovoRepositorioDeUsuarios(db)
	usuarioToken, erro := usuarioDoToken(r, repoUsuarios)
	if erro != nil {
		respostas.Erro(w, http.StatusUnauthorized, erro)
		return
	}
	if !ehProprioPerfil(usuarioToken, nick) {
		respostas.Erro(w, http.StatusForbidden, errors.New("Só é possível atualizar as próprias configurações"))
		return
	}

	repoConfig := repositorios.NovoRepositorioDeConfiguracoes(db)
	atual, erro := repoConfig.BuscarOuCriar(usuarioToken.ID)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	corpo, erro := io.ReadAll(r.Body)
	if erro != nil {
		respostas.Erro(w, http.StatusUnprocessableEntity, erro)
		return
	}

	if erro = json.Unmarshal(corpo, &atual); erro != nil {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}

	atual.UsuarioID = usuarioToken.ID
	permiteCustomPro := modelos.TemPlanoPro(usuarioToken)
	if erro = atual.Preparar(permiteCustomPro); erro != nil {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}

	if erro = repoConfig.Atualizar(usuarioToken.ID, atual); erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	atualizado, erro := repoConfig.BuscarOuCriar(usuarioToken.ID)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	if !permiteCustomPro {
		atualizado = modelos.SanitizarAparenciaSemPro(atualizado)
	}

	respostas.JSON(w, http.StatusOK, atualizado)
}

// ReativarUsuario reativa conta soft-deleted dentro da janela de 30 dias.
func ReativarUsuario(w http.ResponseWriter, r *http.Request) {
	corpo, erro := io.ReadAll(r.Body)
	if erro != nil {
		respostas.Erro(w, http.StatusUnprocessableEntity, erro)
		return
	}

	var req modelos.ReativarContaRequest
	if erro = json.Unmarshal(corpo, &req); erro != nil {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}
	if req.Nick == "" || req.Senha == "" {
		respostas.Erro(w, http.StatusBadRequest, errors.New("Nick e senha são obrigatórios"))
		return
	}

	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	repo := repositorios.NovoRepositorioDeUsuarios(db)
	usuario, erro := repo.BuscarPorNickParaLogin(req.Nick)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	if usuario.ID == 0 {
		respostas.Erro(w, http.StatusUnauthorized, errors.New("Nick ou senha inválidos"))
		return
	}

	if erro = security.VerificarSenha(usuario.Senha, req.Senha); erro != nil {
		respostas.Erro(w, http.StatusUnauthorized, errors.New("Nick ou senha inválidos"))
		return
	}

	if usuario.Status == "ativo" {
		respostas.JSON(w, http.StatusOK, map[string]string{"mensagem": "Conta já está ativa"})
		return
	}

	if !repo.PodeReativar(usuario) {
		respostas.Erro(w, http.StatusForbidden, errors.New("O prazo de 30 dias para reativar a conta expirou"))
		return
	}

	if erro = repo.Reativar(usuario.ID); erro != nil {
		respostas.Erro(w, http.StatusForbidden, erro)
		return
	}

	respostas.JSON(w, http.StatusOK, map[string]string{"mensagem": "Conta reativada com sucesso"})
}
