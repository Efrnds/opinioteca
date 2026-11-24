package auth

import (
	"backend/src/infra/config"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func configurarChaveTeste(t *testing.T) {
	t.Helper()
	anterior := config.SecretKey
	config.SecretKey = []byte("chave-de-teste-com-mais-de-trinta-e-dois-caracteres")
	t.Cleanup(func() { config.SecretKey = anterior })
}

func TestTokenCompativelComSessoesExistentes(t *testing.T) {
	configurarChaveTeste(t)
	// Mesmo formato HS256/MapClaims emitido pela biblioteca anterior.
	header := base64.RawURLEncoding.EncodeToString([]byte(`{"alg":"HS256","typ":"JWT"}`))
	claims, err := json.Marshal(map[string]any{
		"authorized": true, "exp": time.Now().Add(time.Hour).Unix(),
		"usuarioId": 42, "status": "ativo", "isAdmin": true,
	})
	if err != nil {
		t.Fatal(err)
	}
	payload := header + "." + base64.RawURLEncoding.EncodeToString(claims)
	assinatura := hmac.New(sha256.New, config.SecretKey)
	assinatura.Write([]byte(payload))
	token := payload + "." + base64.RawURLEncoding.EncodeToString(assinatura.Sum(nil))
	verificarTokenValido(t, token)
}

func TestCriarToken(t *testing.T) {
	configurarChaveTeste(t)
	token, err := CriarToken(42, "ativo", true)
	if err != nil {
		t.Fatal(err)
	}
	verificarTokenValido(t, token)
}

func verificarTokenValido(t *testing.T, token string) {
	t.Helper()
	req := httptest.NewRequest("GET", "/", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	if err := ValidarToken(req); err != nil {
		t.Fatal(err)
	}
	if id, err := ExtrairUsuarioID(req); err != nil || id != 42 {
		t.Fatalf("usuario = %d, erro = %v", id, err)
	}
	if id, err := ExtrairUsuarioIDDoToken(token); err != nil || id != 42 {
		t.Fatalf("usuario WebSocket = %d, erro = %v", id, err)
	}
	if admin, err := ExtrairIsAdmin(req); err != nil || !admin {
		t.Fatalf("admin = %v, erro = %v", admin, err)
	}
}

func TestRejeitarTokensInvalidos(t *testing.T) {
	configurarChaveTeste(t)
	for _, caso := range []struct {
		nome      string
		metodo    jwt.SigningMethod
		chave     []byte
		expiracao time.Time
	}{
		{"expirado", jwt.SigningMethodHS256, config.SecretKey, time.Now().Add(-time.Minute)},
		{"assinatura incorreta", jwt.SigningMethodHS256, []byte("outra-chave"), time.Now().Add(time.Hour)},
		{"algoritmo inesperado", jwt.SigningMethodHS512, config.SecretKey, time.Now().Add(time.Hour)},
	} {
		t.Run(caso.nome, func(t *testing.T) {
			token, err := jwt.NewWithClaims(caso.metodo, jwt.MapClaims{"usuarioId": 42, "isAdmin": true, "exp": caso.expiracao.Unix()}).SignedString(caso.chave)
			if err != nil {
				t.Fatal(err)
			}
			req := httptest.NewRequest("GET", "/", nil)
			req.Header.Set("Authorization", "Bearer "+token)
			if err := ValidarToken(req); err == nil {
				t.Fatal("token invalido aceito")
			}
			if id := ExtrairUsuarioIDOpcional(req); id != 0 {
				t.Fatalf("usuario invalido = %d", id)
			}
			if _, err := ExtrairUsuarioIDDoToken(token); err == nil {
				t.Fatal("token WebSocket invalido aceito")
			}
			if _, err := ExtrairIsAdmin(req); err == nil {
				t.Fatal("permissao admin invalida aceita")
			}
		})
	}
}
