package config

import (
	"fmt"
	"log"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

var (
	// StringConexaoBanco é a string de conexão com o banco de dados
	StringConexaoBanco = ""
	// Porta é a porta onde a API vai rodar
	Porta = 0
	// SecretKey é a chave secreta usada para assinar os tokens JWT
	SecretKey []byte
)

// A função Carregar, carrega as variáveis de ambiente no arquivo .env
func Carregar() {
	var erro error

	if erro = godotenv.Load(); erro != nil {
		log.Fatalf("Erro ao carregar as variáveis de ambiente: %v", erro)
	}

	Porta, erro = strconv.Atoi(os.Getenv("API_PORT"))
	if erro != nil {
		Porta = 9000
	}

	StringConexaoBanco = fmt.Sprintf("postgresql://%s:%s@%s:%s/%s?sslmode=disable",
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASS"),
		os.Getenv("DB_HOST"),
		os.Getenv("DB_PORT"),
		os.Getenv("DB_NOME"),
	)

	SecretKey = []byte(os.Getenv("SECRET_KEY"))
}