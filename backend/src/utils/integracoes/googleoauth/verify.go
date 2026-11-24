package googleoauth

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// Profile dados verificados do id_token do Google.
type Profile struct {
	Sub     string
	Email   string
	Nome    string
	Picture string
}

type tokenInfo struct {
	Aud           string `json:"aud"`
	Sub           string `json:"sub"`
	Email         string `json:"email"`
	EmailVerified string `json:"email_verified"`
	Name          string `json:"name"`
	Picture       string `json:"picture"`
	Error         string `json:"error"`
	ErrorDesc     string `json:"error_description"`
}

var httpClient = &http.Client{Timeout: 8 * time.Second}

// VerificarIDToken valida o JWT do Google via tokeninfo e confere o audience (client id).
func VerificarIDToken(idToken, clientID string) (Profile, error) {
	idToken = strings.TrimSpace(idToken)
	clientID = strings.TrimSpace(clientID)
	if idToken == "" {
		return Profile{}, errors.New("id_token ausente")
	}
	if clientID == "" {
		return Profile{}, errors.New("GOOGLE_CLIENT_ID não configurado")
	}

	endpoint := "https://oauth2.googleapis.com/tokeninfo?id_token=" + url.QueryEscape(idToken)
	resp, erro := httpClient.Get(endpoint)
	if erro != nil {
		return Profile{}, fmt.Errorf("falha ao validar token Google: %w", erro)
	}
	defer resp.Body.Close()

	var info tokenInfo
	if erro = json.NewDecoder(resp.Body).Decode(&info); erro != nil {
		return Profile{}, errors.New("resposta inválida do Google")
	}
	if info.Error != "" {
		msg := info.Error
		if info.ErrorDesc != "" {
			msg = info.ErrorDesc
		}
		return Profile{}, fmt.Errorf("token Google inválido: %s", msg)
	}
	if resp.StatusCode != http.StatusOK {
		return Profile{}, errors.New("token Google rejeitado")
	}
	if info.Aud != clientID {
		return Profile{}, errors.New("token Google com audience inválido")
	}
	if info.Sub == "" || info.Email == "" {
		return Profile{}, errors.New("token Google sem email ou subject")
	}
	if !emailVerificado(info.EmailVerified) {
		return Profile{}, errors.New("email Google não verificado")
	}

	nome := strings.TrimSpace(info.Name)
	if nome == "" {
		nome = strings.Split(info.Email, "@")[0]
	}

	return Profile{
		Sub:     info.Sub,
		Email:   strings.ToLower(strings.TrimSpace(info.Email)),
		Nome:    nome,
		Picture: strings.TrimSpace(info.Picture),
	}, nil
}

func emailVerificado(v string) bool {
	switch strings.ToLower(strings.TrimSpace(v)) {
	case "true", "1":
		return true
	default:
		return false
	}
}
