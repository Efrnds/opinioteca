package controllers

import (
	"backend/src/auth"
	"backend/src/banco"
	"backend/src/config"
	"backend/src/integracoes/googleoauth"
	"backend/src/modelos"
	"backend/src/repositorios"
	"backend/src/respostas"
	"backend/src/security"
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

// LoginGoogle autentica (ou cria) usuário a partir de um id_token verificado do Google.
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

	if !security.LoginPermitido(r) {
		respostas.Erro(w, http.StatusTooManyRequests, errors.New("Muitas tentativas. Tente novamente em alguns minutos."))
		return
	}

	perfil, erro := googleoauth.VerificarIDToken(payload.IDToken, config.GoogleClientID)
	if erro != nil {
		security.RegistrarFalhaLogin(r)
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

	security.RegistrarSucessoLogin(r)
	respostas.JSON(w, http.StatusOK, modelos.LoginResposta{
		Token:   token,
		IsAdmin: usuarioCompleto.IsAdmin,
		Usuario: usuarioCompleto.ListarPrivado(),
	})
}

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

func senhaAleatoriaOAuth() (string, error) {
	buf := make([]byte, 32)
	if _, erro := rand.Read(buf); erro != nil {
		return "", erro
	}
	return hex.EncodeToString(buf), nil
}

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

func truncarNick(s string, max int) string {
	if max < 1 {
		return ""
	}
	if len(s) <= max {
		return s
	}
	return s[:max]
}

func sufixoAleatorio(n int) (string, error) {
	buf := make([]byte, (n+1)/2)
	if _, erro := rand.Read(buf); erro != nil {
		return "", erro
	}
	return hex.EncodeToString(buf)[:n], nil
}
