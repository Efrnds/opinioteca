package controllers

import (
	"backend/src/banco"
	"backend/src/email"
	"backend/src/repositorios"
	"backend/src/respostas"
	"backend/src/security"
	"crypto/rand"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math/big"
	"net/http"
	"regexp"
	"strings"
	"time"
)

const (
	otpValidadeMinutos = 10
	otpMaxTentativas   = 5
	senhaMinLength     = 6
	msgRecuperacaoOK   = "Se existir uma conta para este e-mail, enviamos um código de verificação."
)

var emailRegex = regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]+$`)

func normalizarEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

func gerarOTP() (string, error) {
	n, erro := rand.Int(rand.Reader, big.NewInt(900000))
	if erro != nil {
		return "", erro
	}
	return fmt.Sprintf("%06d", n.Int64()+100000), nil
}

func erroOTP(reset *repositorios.PasswordReset) string {
	if reset == nil {
		return "Código inválido ou expirado."
	}
	if reset.UsedAt != nil {
		return "Este código já foi utilizado. Solicite um novo."
	}
	if reset.ExpiresAt.Before(time.Now()) {
		return "Este código expirou. Solicite um novo."
	}
	if reset.Attempts >= otpMaxTentativas {
		return "Número de tentativas excedido. Solicite um novo código."
	}
	return ""
}

// SolicitarRecuperacaoSenha gera OTP e envia por e-mail (resposta sempre genérica).
func SolicitarRecuperacaoSenha(w http.ResponseWriter, r *http.Request) {
	if !security.LoginPermitido(r, "recuperar") {
		respostas.Erro(w, http.StatusTooManyRequests, errors.New("Muitas tentativas. Tente novamente em alguns minutos."))
		return
	}

	corpo, erro := io.ReadAll(r.Body)
	if erro != nil {
		respostas.Erro(w, http.StatusUnprocessableEntity, erro)
		return
	}

	var req struct {
		Email string `json:"email"`
	}
	if erro = json.Unmarshal(corpo, &req); erro != nil {
		respostas.Erro(w, http.StatusBadRequest, errors.New("JSON inválido"))
		return
	}

	emailNorm := normalizarEmail(req.Email)
	if !emailRegex.MatchString(emailNorm) {
		respostas.Erro(w, http.StatusBadRequest, errors.New("Informe um e-mail válido."))
		return
	}

	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	usuario, erro := repositorios.NovoRepositorioDeUsuarios(db).BuscarPorEmailParaLogin(emailNorm)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	// Conta inexistente ou inativa: mesma mensagem (não vaza existência).
	if usuario.ID == 0 || !strings.EqualFold(usuario.Status, "ativo") {
		respostas.JSON(w, http.StatusOK, map[string]string{"mensagem": msgRecuperacaoOK})
		return
	}

	codigo, erro := gerarOTP()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, errors.New("Não foi possível gerar o código."))
		return
	}
	hash, erro := security.Hash(codigo)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	repoReset := repositorios.NovoRepositorioDePasswordResets(db)
	if erro = repoReset.InvalidarAnteriores(usuario.ID); erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	expires := time.Now().Add(otpValidadeMinutos * time.Minute)
	if _, erro = repoReset.Criar(usuario.ID, string(hash), expires); erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	// Busca e-mail canônico no perfil completo.
	completo, erro := repositorios.NovoRepositorioDeUsuarios(db).BuscarPorID(usuario.ID)
	if erro != nil || completo.Email == "" {
		respostas.JSON(w, http.StatusOK, map[string]string{"mensagem": msgRecuperacaoOK})
		return
	}

	if erro = email.EnviarOTPRecuperacaoSenha(completo.Email, codigo, otpValidadeMinutos); erro != nil {
		security.RegistrarFalhaLogin(r, "recuperar")
		respostas.Erro(w, http.StatusInternalServerError, errors.New("Não foi possível enviar o e-mail. Tente novamente em instantes."))
		return
	}

	respostas.JSON(w, http.StatusOK, map[string]string{"mensagem": msgRecuperacaoOK})
}

// VerificarCodigoRecuperacao confere o OTP sem consumi-lo.
func VerificarCodigoRecuperacao(w http.ResponseWriter, r *http.Request) {
	corpo, erro := io.ReadAll(r.Body)
	if erro != nil {
		respostas.Erro(w, http.StatusUnprocessableEntity, erro)
		return
	}

	var req struct {
		Email  string `json:"email"`
		Codigo string `json:"codigo"`
	}
	if erro = json.Unmarshal(corpo, &req); erro != nil {
		respostas.Erro(w, http.StatusBadRequest, errors.New("JSON inválido"))
		return
	}

	emailNorm := normalizarEmail(req.Email)
	codigo := strings.TrimSpace(req.Codigo)
	if !emailRegex.MatchString(emailNorm) || codigo == "" {
		respostas.Erro(w, http.StatusBadRequest, errors.New("Informe o e-mail e o código."))
		return
	}

	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	usuario, erro := repositorios.NovoRepositorioDeUsuarios(db).BuscarPorEmailParaLogin(emailNorm)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	var reset *repositorios.PasswordReset
	if usuario.ID != 0 {
		reset, erro = repositorios.NovoRepositorioDePasswordResets(db).BuscarAtivoPorUsuario(usuario.ID)
		if erro != nil {
			respostas.Erro(w, http.StatusInternalServerError, erro)
			return
		}
	}

	if msg := erroOTP(reset); msg != "" {
		respostas.Erro(w, http.StatusBadRequest, errors.New(msg))
		return
	}

	if security.VerificarSenha(reset.CodeHash, codigo) != nil {
		_ = repositorios.NovoRepositorioDePasswordResets(db).IncrementarTentativas(reset.ID)
		if reset.Attempts+1 >= otpMaxTentativas {
			respostas.Erro(w, http.StatusBadRequest, errors.New("Número de tentativas excedido. Solicite um novo código."))
			return
		}
		respostas.Erro(w, http.StatusBadRequest, errors.New("Código incorreto."))
		return
	}

	respostas.JSON(w, http.StatusOK, map[string]string{
		"mensagem": "Código validado. Defina uma nova senha.",
	})
}

// RedefinirSenhaComCodigo troca a senha após revalidar o OTP e o consome.
func RedefinirSenhaComCodigo(w http.ResponseWriter, r *http.Request) {
	corpo, erro := io.ReadAll(r.Body)
	if erro != nil {
		respostas.Erro(w, http.StatusUnprocessableEntity, erro)
		return
	}

	var req struct {
		Email           string `json:"email"`
		Codigo          string `json:"codigo"`
		Senha           string `json:"senha"`
		ConfirmarSenha  string `json:"confirmarSenha"`
	}
	if erro = json.Unmarshal(corpo, &req); erro != nil {
		respostas.Erro(w, http.StatusBadRequest, errors.New("JSON inválido"))
		return
	}

	if len(req.Senha) < senhaMinLength {
		respostas.Erro(w, http.StatusBadRequest, fmt.Errorf("A senha deve ter pelo menos %d caracteres.", senhaMinLength))
		return
	}
	if req.Senha != req.ConfirmarSenha {
		respostas.Erro(w, http.StatusBadRequest, errors.New("A senha e a confirmação não coincidem."))
		return
	}

	emailNorm := normalizarEmail(req.Email)
	codigo := strings.TrimSpace(req.Codigo)
	if !emailRegex.MatchString(emailNorm) || codigo == "" {
		respostas.Erro(w, http.StatusBadRequest, errors.New("Informe o e-mail e o código."))
		return
	}

	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	repoUsuarios := repositorios.NovoRepositorioDeUsuarios(db)
	usuario, erro := repoUsuarios.BuscarPorEmailParaLogin(emailNorm)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	repoReset := repositorios.NovoRepositorioDePasswordResets(db)
	var reset *repositorios.PasswordReset
	if usuario.ID != 0 {
		reset, erro = repoReset.BuscarAtivoPorUsuario(usuario.ID)
		if erro != nil {
			respostas.Erro(w, http.StatusInternalServerError, erro)
			return
		}
	}

	if msg := erroOTP(reset); msg != "" {
		respostas.Erro(w, http.StatusBadRequest, errors.New(msg))
		return
	}

	if security.VerificarSenha(reset.CodeHash, codigo) != nil {
		_ = repoReset.IncrementarTentativas(reset.ID)
		respostas.Erro(w, http.StatusBadRequest, errors.New("Código incorreto ou expirado."))
		return
	}

	senhaHash, erro := security.Hash(req.Senha)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	if erro = repoUsuarios.AtualizarSenha(usuario.ID, string(senhaHash)); erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	if erro = repoReset.MarcarUsado(reset.ID); erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	respostas.JSON(w, http.StatusOK, map[string]string{
		"mensagem": "Senha redefinida com sucesso. Faça login com a nova senha.",
	})
}
