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
	// GoogleBooksAPIKey chave opcional da Google Books API
	GoogleBooksAPIKey = ""
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
		os.Getenv("POSTGRES_USER"),
		os.Getenv("POSTGRES_PASSWORD"),
		os.Getenv("POSTGRES_HOST"),
		os.Getenv("POSTGRES_PORT"),
		os.Getenv("POSTGRES_DB"),
	)

	SecretKey = []byte(os.Getenv("SECRET_KEY"))
	GoogleBooksAPIKey = os.Getenv("GOOGLE_BOOKS_API_KEY")
}
