package security

import "golang.org/x/crypto/bcrypt"

// Hash é a função responsável por gerar um hash da senha fornecida, utilizando o algoritmo bcrypt
func Hash(senha string) ([]byte, error) {
	return bcrypt.GenerateFromPassword([]byte(senha), bcrypt.DefaultCost)
}

// VerificarSenha é a função responsável por comparar a senha fornecida com o hash armazenado, retornando um erro se as senhas não correspondem.
func VerificarSenha(senhaHash, senhaString string) error {
	return bcrypt.CompareHashAndPassword([]byte(senhaHash), []byte(senhaString))
}
