package security

import "golang.org/x/crypto/bcrypt"

// Gera o bcrypt da senha antes de gravar.
func Hash(senha string) ([]byte, error) {
	return bcrypt.GenerateFromPassword([]byte(senha), bcrypt.DefaultCost)
}

// Compara a senha digitada com o hash que está no banco.
func VerificarSenha(senhaHash, senhaString string) error {
	return bcrypt.CompareHashAndPassword([]byte(senhaHash), []byte(senhaString))
}
