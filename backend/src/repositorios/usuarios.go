package repositorios

import (
	"backend/src/modelos"
	"database/sql"
	"fmt"
)

// Usuarios é a struct responsável por representar o repositório de usuários.
type Usuarios struct {
	db *sql.DB
}

// NovoRepositorioDeUsuarios é a função responsável por criar um novo repositório de usuários.
func NovoRepositorioDeUsuarios(db *sql.DB) *Usuarios {
	return &Usuarios{db}
}

func (repositorio Usuarios) Criar(usuario modelos.Usuario) (uint64, error) {
	var id uint64

	erro := repositorio.db.QueryRow(
		"INSERT INTO usuarios (nome, nick, email, senha, status) VALUES ($1, $2, $3, $4, $5) RETURNING id",
		usuario.Nome,
		usuario.Nick,
		usuario.Email,
		usuario.Senha,
		"ativo",
	).Scan(&id)
	if erro != nil {
		return 0, erro
	}

	return uint64(id), nil
}

// Buscar tras todos os usuários que correspondem ao nome ou nick fornecido, retornando uma lista de usuários e um erro, se houver.
func (repositorio Usuarios) Buscar(nomeOuNick string) ([]modelos.Usuario, error) {
	nomeOuNick = fmt.Sprintf("%%%s%%", nomeOuNick) // as duas primeiras e ultimas % se referem à "%" em string, e a terceira % se refere a uma string

	linhas, erro := repositorio.db.Query(
		"SELECT id, nome, nick, email, rank_confiabilidade, assinatura_id, is_admin, sequencia_atual, maior_sequencia, modo_zen, status, criadoEm FROM usuarios WHERE nome ILIKE $1 or nick ILIKE $1",
		nomeOuNick)
	if erro != nil {
		return nil, erro
	}
	defer linhas.Close()

	usuarios := make([]modelos.Usuario, 0)
	for linhas.Next() {
		var usuario modelos.Usuario
		if erro = linhas.Scan(
			&usuario.ID,
			&usuario.Nome,
			&usuario.Nick,
			&usuario.Email,
			&usuario.RankConfiabilidade,
			&usuario.AssinaturaID,
			&usuario.IsAdmin,
			&usuario.SequenciaAtual,
			&usuario.MaiorSequencia,
			&usuario.ModoZen,
			&usuario.Status,
			&usuario.CriadoEm,
		); erro != nil {
			return nil, erro
		}

		usuarios = append(usuarios, usuario)
	}

	return usuarios, nil
}

// BuscarPorID trás um usuário específico do banco de dados, com base no ID fornecido, retornando o usuário e um erro, se houver.
func (repositorio Usuarios) BuscarPorID(usuarioID uint64) (modelos.Usuario, error) {
	linhas, erro := repositorio.db.Query(
		"SELECT id, nome, nick, email, rank_confiabilidade, assinatura_id, is_admin, sequencia_atual, maior_sequencia, modo_zen, status, criadoEm FROM usuarios WHERE id = $1",
		usuarioID)
	if erro != nil {
		return modelos.Usuario{}, erro
	}
	defer linhas.Close()

	var usuario modelos.Usuario
	if linhas.Next() {
		if erro = linhas.Scan(
			&usuario.ID,
			&usuario.Nome,
			&usuario.Nick,
			&usuario.Email,
			&usuario.RankConfiabilidade,
			&usuario.AssinaturaID,
			&usuario.IsAdmin,
			&usuario.SequenciaAtual,
			&usuario.MaiorSequencia,
			&usuario.ModoZen,
			&usuario.Status,
			&usuario.CriadoEm,
		); erro != nil {
			return modelos.Usuario{}, erro
		}
	}

	return usuario, nil
}

// Atualizar é a função responsável por atualizar um usuário específico no banco de dados, com base no ID fornecido, retornando um erro, se houver.
func (repositorio Usuarios) Atualizar(usuarioID uint64, usuario modelos.Usuario) error {
	statement, erro := repositorio.db.Prepare(
		"UPDATE usuarios SET nome = $1, nick = $2, email = $3 WHERE id = $4",
	)
	if erro != nil {
		return erro
	}
	defer statement.Close()

	if _, erro = statement.Exec(
		usuario.Nome,
		usuario.Nick,
		usuario.Email,
		usuarioID,
	); erro != nil {
		return erro
	}

	return nil
}

// Deletar é a função responsável por deletar um usuário específico no banco de dados, com base no ID fornecido, retornando um erro, se houver.
func (repositorio Usuarios) Inativar(usuarioID uint64) error {
	statement, erro := repositorio.db.Prepare(
		"UPDATE usuarios SET status = 'inativo' WHERE id = $1",
	)
	if erro != nil {
		return erro
	}
	defer statement.Close()

	if _, erro = statement.Exec(usuarioID); erro != nil {
		return erro
	}

	return nil
}

// BuscarPorEmail é a função responsável por buscar um usuário específico do banco de dados, com base no email fornecido, retornando o usuário e um erro, se houver.
func (repositorio Usuarios) BuscarPorEmail(email string) (modelos.Usuario, error) {
	linha, erro := repositorio.db.Query(
		"SELECT id, senha FROM usuarios WHERE email = $1",
		email)
	if erro != nil {
		return modelos.Usuario{}, erro
	}
	defer linha.Close()

	var usuario modelos.Usuario

	if linha.Next() {
		if erro = linha.Scan(
			&usuario.ID,
			&usuario.Senha,
		); erro != nil {
			return modelos.Usuario{}, erro
		}
	}

	return usuario, nil
}

// Seguir é a função responsável por permitir que um usuário siga outro usuário, com base nos IDs fornecidos, retornando um erro, se houver.
func (repositorio Usuarios) Seguir(IDSeguido, IDSeguidor uint64) error {
	statement, erro := repositorio.db.Prepare(
		"INSERT INTO seguidores (id_seguido, id_seguidor) VALUES ($1,$2) ON CONFLICT (id_seguido, id_seguidor) DO NOTHING", // on conflict impede que um usuário siga o mesmo usuário mais de uma vez
	)
	if erro != nil {
		return erro
	}
	defer statement.Close()

	if _, erro = statement.Exec(IDSeguido, IDSeguidor); erro != nil {
		return erro
	}

	return nil
}

// DeixarSeguir é a função responsável por permitir que um usuário pare de seguir outro usuário, com base nos IDs fornecidos, retornando um erro, se houver.
func (repositorio Usuarios) DeixarSeguir(IDSeguido, IDSeguidor uint64) error {
	statement, erro := repositorio.db.Prepare(
		"DELETE FROM seguidores WHERE id_seguido = $1 AND id_seguidor = $2",
	)
	if erro != nil {
		return erro
	}
	defer statement.Close()

	if _, erro = statement.Exec(IDSeguido, IDSeguidor); erro != nil {
		return erro
	}

	return nil
}

// BuscarSeguidores é a função responsável por buscar os seguidores de um usuário específico do banco de dados, com base no ID fornecido, retornando uma lista de usuários e um erro, se houver.
func (repositorio Usuarios) BuscarSeguidores(IDSeguido uint64) ([]modelos.Usuario, error) {
	linhas, erro := repositorio.db.Query(
		` SELECT u.id, u.nome, u.nick, u.email, u.criadoEm
		FROM usuarios u
		INNER JOIN seguidores s
		ON u.id = s.id_seguidor
		WHERE s.id_seguido = $1
		`,
		IDSeguido)
	if erro != nil {
		return nil, erro
	}
	defer linhas.Close()

	var usuarios []modelos.Usuario
	for linhas.Next() {
		var usuario modelos.Usuario
		if erro = linhas.Scan(
			&usuario.ID,
			&usuario.Nome,
			&usuario.Nick,
			&usuario.Email,
			&usuario.CriadoEm,
		); erro != nil {
			return nil, erro
		}
		usuarios = append(usuarios, usuario)
	}

	return usuarios, nil
}

// BuscarSeguindo é a função responsável por buscar os usuários que um usuário específico está seguindo, com base no ID fornecido, retornando uma lista de usuários e um erro, se houver.
func (repositorio Usuarios) BuscarSeguindo(IDSeguido uint64) ([]modelos.Usuario, error) {
	linhas, erro := repositorio.db.Query(
		` SELECT u.id, u.nome, u.nick, u.email, u.criadoEm
		FROM usuarios u
		INNER JOIN seguidores s
		ON u.id = s.id_seguido
		WHERE s.id_seguidor = $1
		`,
		IDSeguido)
	if erro != nil {
		return nil, erro
	}
	defer linhas.Close()

	var usuarios []modelos.Usuario
	for linhas.Next() {
		var usuario modelos.Usuario
		if erro = linhas.Scan(
			&usuario.ID,
			&usuario.Nome,
			&usuario.Nick,
			&usuario.Email,
			&usuario.CriadoEm,
		); erro != nil {
			return nil, erro
		}
		usuarios = append(usuarios, usuario)
	}

	return usuarios, nil
}

// BuscarSenha
func (repositorio Usuarios) BuscarSenha(usuarioID uint64) (string, error) {
	linha, erro := repositorio.db.Query(
		"SELECT senha FROM usuarios WHERE id = $1",
		usuarioID)
	if erro != nil {
		return "", erro
	}
	defer linha.Close()

	var usuario modelos.Usuario
	if linha.Next() {
		if erro = linha.Scan(
			&usuario.Senha,
		); erro != nil {
			return "", erro
		}
	}

	return usuario.Senha, nil
}

func (repositorio Usuarios) AtualizarSenha(usuarioID uint64, senha string) error {
	statement, erro := repositorio.db.Prepare(
		"UPDATE usuarios SET senha = $1 WHERE id = $2",
	)
	if erro != nil {
		return erro
	}
	defer statement.Close()

	if _, erro = statement.Exec(senha, usuarioID); erro != nil {
		return erro
	}

	return nil
}
