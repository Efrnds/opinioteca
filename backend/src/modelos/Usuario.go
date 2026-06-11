package modelos

import (
	"backend/src/security"
	"errors"
	"strings"
	"time"

	"github.com/badoux/checkmail"
)

// Usuario representa a estrutura de um usuário da aplicação
type Usuario struct {
	ID                 uint64    `json:"id,omitempty"`
	Nome               string    `json:"nome,omitempty"`
	Nick               string    `json:"nick,omitempty"`
	Email              string    `json:"email,omitempty"`
	Senha              string    `json:"senha,omitempty"`
	CriadoEm           time.Time `json:"criadoEm,omitempty"`
	RankConfiabilidade int       `json:"rankConfiabilidade"`
	AssinaturaID       uint64    `json:"assinaturaId"`
	SequenciaAtual     int       `json:"sequenciaAtual"`
	MaiorSequencia     int       `json:"maiorSequencia"`
	ModoZen            bool      `json:"modoZen"`
	Status             string    `json:"status"`
	IsAdmin            bool      `json:"isAdmin"`
}

// Preparar é responsável por validar e formatar os dados do usuário antes de serem persistidos no banco de dados.
func (usuario *Usuario) Preparar(etapa string) error {
	if erro := usuario.validar(etapa); erro != nil {
		return erro
	}

	if erro := usuario.formatar(etapa); erro != nil {
		return erro
	}

	return nil
}

func (usuario *Usuario) validar(etapa string) error {
	if usuario.Nome == "" {
		return errors.New("O nome é obrigatório e não pode estar em branco!")
	}
	if usuario.Nick == "" {
		return errors.New("O nick é obrigatório e não pode estar em branco!")
	}
	if usuario.Email == "" {
		return errors.New("O email é obrigatório e não pode estar em branco!")
	}

	if erro := checkmail.ValidateFormat(usuario.Email); erro != nil {
		return errors.New("O email inserido é inválido!")
	}

	if etapa == "cadastro" && usuario.Senha == "" {
		return errors.New("A senha é obrigatória e não pode estar em branco!")
	}

	return nil
}

func (usuario *Usuario) formatar(etapa string) error {
	usuario.Nome = strings.TrimSpace(usuario.Nome)
	usuario.Nick = strings.TrimSpace(usuario.Nick)
	usuario.Email = strings.TrimSpace(usuario.Email)

	if etapa == "cadastro" {
		senhaHash, erro := security.Hash(usuario.Senha)
		if erro != nil {
			return erro
		}
		usuario.Senha = string(senhaHash)
	}

	return nil
}

func (usuario *Usuario) OcultarSenha() Usuario {
	return Usuario{
		ID: usuario.ID,
		Nome: usuario.Nome,
		Nick: usuario.Nick,
		Email: usuario.Email,
		Senha: "",
		AssinaturaID: usuario.AssinaturaID,
		IsAdmin: usuario.IsAdmin,
		MaiorSequencia: usuario.MaiorSequencia,
		ModoZen: usuario.ModoZen,
		Status: usuario.Status,
		CriadoEm: usuario.CriadoEm,
		RankConfiabilidade: usuario.RankConfiabilidade,
		SequenciaAtual: usuario.SequenciaAtual,
	}
}

func (usuario *Usuario) ListaOutrosUsuarios() Usuario {
	return Usuario{
		ID: usuario.ID,
		Nome: usuario.Nome,
		Nick: usuario.Nick,
	}
}