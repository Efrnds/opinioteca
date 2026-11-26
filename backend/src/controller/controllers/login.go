package controllers

import (
	"backend/src/model/banco"
	"backend/src/model/modelos"
	"backend/src/model/repositorios"
	"backend/src/utils/auth"
	"backend/src/utils/respostas"
	"backend/src/utils/security"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
)

// Confere nick ou e-mail e senha, aplica o bloqueio de tentativas e devolve o JWT.
func Login(w http.ResponseWriter, r *http.Request) {
	corpoRequisicao, erro := io.ReadAll(r.Body)
	if erro != nil {
		respostas.Erro(w, http.StatusUnprocessableEntity, erro)
		return
	}

	var credenciais struct {
		Nick  string `json:"nick"`
		Senha string `json:"senha"`
	}
	if erro = json.Unmarshal(corpoRequisicao, &credenciais); erro != nil {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}

	identificador := strings.TrimSpace(credenciais.Nick)
	if identificador == "" || credenciais.Senha == "" {
		respostas.Erro(w, http.StatusBadRequest, errors.New("Nick/email e senha são obrigatórios"))
		return
	}

	if !security.LoginPermitido(r, identificador) {
		respostas.Erro(w, http.StatusTooManyRequests, errors.New("Muitas tentativas. Tente novamente em alguns minutos."))
		return
	}

	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	repositorio := repositorios.NovoRepositorioDeUsuarios(db)
	usuarioSalvoNoBanco, erro := repositorio.BuscarPorNickOuEmailParaLogin(identificador)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	if usuarioSalvoNoBanco.ID == 0 {
		security.RegistrarFalhaLogin(r, identificador)
		respostas.Erro(w, http.StatusUnauthorized, errors.New("Nick/email ou senha inválidos"))
		return
	}

	if erro = security.VerificarSenha(usuarioSalvoNoBanco.Senha, credenciais.Senha); erro != nil {
		security.RegistrarFalhaLogin(r, identificador)
		respostas.Erro(w, http.StatusUnauthorized, errors.New("Nick/email ou senha inválidos"))
		return
	}

	usuarioCompleto, erro := repositorio.BuscarPorID(usuarioSalvoNoBanco.ID)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	if usuarioSalvoNoBanco.Status == "inativo" {
		podeReativar := repositorio.PodeReativar(usuarioSalvoNoBanco)
		mensagem := "Usuário inativo ou não encontrado"
		if podeReativar {
			mensagem = "Conta desativada. Você pode reativá-la em até 30 dias."
		}
		respostas.JSON(w, http.StatusUnauthorized, map[string]any{
			"erro":         mensagem,
			"podeReativar": podeReativar,
			"nick":         usuarioCompleto.Nick,
		})
		return
	}

	token, erro := auth.CriarToken(usuarioCompleto.ID, usuarioCompleto.Status, usuarioCompleto.IsAdmin)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	_ = repositorio.GarantirPrivilegiosPro(&usuarioCompleto)

	security.RegistrarSucessoLogin(r, identificador)
	respostas.JSON(w, http.StatusOK, modelos.LoginResposta{
		Token:   token,
		IsAdmin: usuarioCompleto.IsAdmin,
		Usuario: usuarioCompleto.ListarPrivado(),
	})
}
