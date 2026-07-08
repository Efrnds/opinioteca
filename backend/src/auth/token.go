package auth

import (
	"backend/src/config"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/dgrijalva/jwt-go"
)

// CriarToken é a função responsável por criar um token JWT para o usuário autenticado, contendo as permissões e o ID do usuário, e retornando o token assinado como string.
func CriarToken(usuarioID uint64, status string, isAdmin bool) (string, error) {
	permissoes := jwt.MapClaims{}
	permissoes["authorized"] = true
	permissoes["exp"] = time.Now().Add(time.Hour * 6).Unix()
	permissoes["usuarioId"] = usuarioID
	permissoes["status"] = status
	permissoes["isAdmin"] = isAdmin
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, permissoes)
	return token.SignedString([]byte(config.SecretKey))
}

// ValidarToken é a função responsável por extrair o ID do usuário presente no token JWT da requisição, retornando o ID como uint64 e um erro caso o token seja inválido ou não contenha o ID do usuário.
func ValidarToken(r *http.Request) error {
	tokenString := extrairToken(r)
	token, erro := jwt.Parse(tokenString, retornarChaveDeVerificacao)
	if erro != nil {
		return erro
	}

	if _, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		return nil
	}

	return errors.New("Token inválido!")
}

// ExtrairUsuarioIDOpcional retorna o ID se o Bearer for válido; 0 e nil se ausente/inválido.
func ExtrairUsuarioIDOpcional(r *http.Request) uint64 {
	id, erro := ExtrairUsuarioID(r)
	if erro != nil {
		return 0
	}
	return id
}

// ExtrairUsuarioID é a função responsável por extrair o ID do usuário presente no token JWT da requisição, retornando o ID como uint64 e um erro caso o token seja inválido ou não contenha o ID do usuário.
func ExtrairUsuarioID(r *http.Request) (uint64, error) {
	tokenString := extrairToken(r)
	token, erro := jwt.Parse(tokenString, retornarChaveDeVerificacao)
	if erro != nil {
		return 0, erro
	}

	if permissoes, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		usuarioID, erro := strconv.ParseUint(fmt.Sprintf("%.0f", permissoes["usuarioId"]), 10, 64)
		if erro != nil {
			return 0, erro
		}
		return usuarioID, nil
	}

	return 0, errors.New("Token inválido")
}

func extrairToken(r *http.Request) string {
	token := r.Header.Get("Authorization")

	if len(strings.Split(token, " ")) == 2 {
		return strings.Split(token, " ")[1]
	}

	return ""
}

func ExtrairUsuarioIDDoToken(tokenString string) (uint64, error) {
	if tokenString == "" {
		return 0, errors.New("Token não informado")
	}

	token, erro := jwt.Parse(tokenString, retornarChaveDeVerificacao)
	if erro != nil {
		return 0, erro
	}

	if permissoes, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		usuarioID, erro := strconv.ParseUint(fmt.Sprintf("%.0f", permissoes["usuarioId"]), 10, 64)
		if erro != nil {
			return 0, erro
		}
		return usuarioID, nil
	}

	return 0, errors.New("Token inválido")
}

func ExtrairTokenDaRequisicao(r *http.Request) string {
	if token := extrairToken(r); token != "" {
		return token
	}
	return r.URL.Query().Get("token")
}

func retornarChaveDeVerificacao(token *jwt.Token) (interface{}, error) {
	if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
		return nil, fmt.Errorf("Método de assinatura inesperado! %v", token.Header["alg"])
	}

	return config.SecretKey, nil
}

// ExtrairIsAdmin é a função responsável por extrair o status do usuário presente no token JWT da requisição, retornando o status como string e um erro caso o token seja inválido ou não contenha o status do usuário.
func ExtrairIsAdmin(r *http.Request) (bool, error) {
	tokenString := extrairToken(r)
	token, erro := jwt.Parse(tokenString, retornarChaveDeVerificacao)
	if erro != nil {
		return false, erro
	}
	if permissoes, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		if isAdmin, ok := permissoes["isAdmin"].(bool); ok {
			return isAdmin, nil
		}
		return false, nil
	}
	return false, errors.New("Token inválido")
}