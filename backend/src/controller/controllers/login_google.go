package controllers

import (
	"backend/src/model/banco"
	"backend/src/model/modelos"
	"backend/src/model/repositorios"
	"backend/src/utils/auth"
	"backend/src/utils/config"
	"backend/src/utils/integracoes/googleoauth"
	"backend/src/utils/respostas"
	"backend/src/utils/security"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"regexp"
	"strings"
)

var nickInvalidoRegex = regexp.MustCompile(`[^a-z0-9_]+`)

// Valida o idToken do Google e entra numa conta já ligada, ou cria o usuário.
func LoginGoogle(w http.ResponseWriter, r *http.Request) {
	corpoRequisicao, erro := io.ReadAll(r.Body)
	if erro != nil {
		respostas.Erro(w, http.StatusUnprocessableEntity, erro)
		return
	}

	var payload struct {
		IDToken string `json:"idToken"`
	}
	if erro = json.Unmarshal(corpoRequisicao, &payload); erro != nil {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}
	if strings.TrimSpace(payload.IDToken) == "" {
		respostas.Erro(w, http.StatusBadRequest, errors.New("idToken é obrigatório"))
		return
	}

	if !security.LoginPermitido(r, "google") {
		respostas.Erro(w, http.StatusTooManyRequests, errors.New("Muitas tentativas. Tente novamente em alguns minutos."))
		return
	}

	perfil, erro := googleoauth.VerificarIDToken(payload.IDToken, config.GoogleClientID)
	if erro != nil {
		security.RegistrarFalhaLogin(r, "google")
		respostas.Erro(w, http.StatusUnauthorized, erro)
		return
	}

	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	repositorio := repositorios.NovoRepositorioDeUsuarios(db)

	usuarioLogin, erro := repositorio.BuscarPorGoogleID(perfil.Sub)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	if usuarioLogin.ID == 0 {
		usuarioLogin, erro = repositorio.BuscarPorEmailParaLogin(perfil.Email)
		if erro != nil {
			respostas.Erro(w, http.StatusInternalServerError, erro)
			return
		}
	}

	if usuarioLogin.ID == 0 {
		novo, erroCriar := criarUsuarioGoogle(repositorio, perfil)
		if erroCriar != nil {
			respostas.Erro(w, http.StatusInternalServerError, erroCriar)
			return
		}
		usuarioLogin.ID = novo.ID
		usuarioLogin.Status = "ativo"
		usuarioLogin.IsAdmin = novo.IsAdmin
	} else if usuarioLogin.Status == "inativo" {
		if !repositorio.PodeReativar(usuarioLogin) {
			respostas.JSON(w, http.StatusUnauthorized, map[string]any{
				"erro":         "Conta desativada e fora do prazo de reativação.",
				"podeReativar": false,
			})
			return
		}
		if erro = repositorio.Reativar(usuarioLogin.ID); erro != nil {
			respostas.Erro(w, http.StatusInternalServerError, erro)
			return
		}
	}

	_ = repositorio.VincularGoogleID(usuarioLogin.ID, perfil.Sub)

	usuarioCompleto, erro := repositorio.BuscarPorID(usuarioLogin.ID)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	token, erro := auth.CriarToken(usuarioCompleto.ID, usuarioCompleto.Status, usuarioCompleto.IsAdmin)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	_ = repositorio.GarantirPrivilegiosPro(&usuarioCompleto)

	security.RegistrarSucessoLogin(r, "google")
	respostas.JSON(w, http.StatusOK, modelos.LoginResposta{
		Token:   token,
		IsAdmin: usuarioCompleto.IsAdmin,
		Usuario: usuarioCompleto.ListarPrivado(),
	})
}

// Cria usuario google no login Google.
func criarUsuarioGoogle(repositorio *repositorios.Usuarios, perfil googleoauth.Profile) (modelos.Usuario, error) {
	senhaAleatoria, erro := senhaAleatoriaOAuth()
	if erro != nil {
		return modelos.Usuario{}, erro
	}
	senhaHash, erro := security.Hash(senhaAleatoria)
	if erro != nil {
		return modelos.Usuario{}, erro
	}

	nick, erro := nickUnicoParaGoogle(repositorio, perfil.Nome, perfil.Email)
	if erro != nil {
		return modelos.Usuario{}, erro
	}

	usuario := modelos.Usuario{
		Nome:   perfil.Nome,
		Nick:   nick,
		Email:  perfil.Email,
		Senha:  string(senhaHash),
		Status: "ativo",
	}

	id, erro := repositorio.CriarOAuth(usuario, perfil.Sub)
	if erro != nil {
		return modelos.Usuario{}, erro
	}
	usuario.ID = id
	return usuario, nil
}

// senhaAleatoriaOAuth: aleatoria o auth no login Google.
func senhaAleatoriaOAuth() (string, error) {
	buf := make([]byte, 32)
	if _, erro := rand.Read(buf); erro != nil {
		return "", erro
	}
	return hex.EncodeToString(buf), nil
}

// nickUnicoParaGoogle: unico para google no login Google.
func nickUnicoParaGoogle(repositorio *repositorios.Usuarios, nome, email string) (string, error) {
	base := nickBaseDe(nome, email)
	for tentativa := 0; tentativa < 40; tentativa++ {
		candidato := base
		if tentativa > 0 {
			sufixo, erro := sufixoAleatorio(4)
			if erro != nil {
				return "", erro
			}
			candidato = truncarNick(base, 50-len(sufixo)-1) + "_" + sufixo
		}
		livre, erro := repositorio.NickDisponivel(candidato)
		if erro != nil {
			return "", erro
		}
		if livre {
			return candidato, nil
		}
	}
	sufixo, erro := sufixoAleatorio(8)
	if erro != nil {
		return "", erro
	}
	return "user_" + sufixo, nil
}

// nickBaseDe: base de no login Google.
func nickBaseDe(nome, email string) string {
	fonte := strings.TrimSpace(nome)
	if fonte == "" {
		fonte = strings.Split(email, "@")[0]
	}
	fonte = strings.ToLower(fonte)
	fonte = strings.ReplaceAll(fonte, " ", "_")
	fonte = nickInvalidoRegex.ReplaceAllString(fonte, "")
	fonte = strings.Trim(fonte, "_")
	if fonte == "" {
		fonte = "leitor"
	}
	return truncarNick(fonte, 40)
}

// truncarNick: nick no login Google.
func truncarNick(s string, max int) string {
	if max < 1 {
		return ""
	}
	if len(s) <= max {
		return s
	}
	return s[:max]
}

// sufixoAleatorio: aleatorio no login Google.
func sufixoAleatorio(n int) (string, error) {
	buf := make([]byte, (n+1)/2)
	if _, erro := rand.Read(buf); erro != nil {
		return "", erro
	}
	return hex.EncodeToString(buf)[:n], nil
}
