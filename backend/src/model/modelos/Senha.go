package modelos

// Senha é a struct responsável por representar a senha de um usuário
type Senha struct {
	Nova  string `json:"nova"`
	Atual string `json:"atual"`
}
