package repositorios

import (
	"backend/src/modelos"
	"database/sql"
	"fmt"
)

const colunasUsuario = `id, nome, nick, email, image_url, rank_confiabilidade, assinatura_id, is_admin, sequencia_atual, maior_sequencia, modo_zen, status, criadoEm`

func scanUsuario(linhas *sql.Rows, usuario *modelos.Usuario) error {
	var image sql.NullString
	if erro := linhas.Scan(
		&usuario.ID,
		&usuario.Nome,
		&usuario.Nick,
		&usuario.Email,
		&image,
		&usuario.RankConfiabilidade,
		&usuario.AssinaturaID,
		&usuario.IsAdmin,
		&usuario.SequenciaAtual,
		&usuario.MaiorSequencia,
		&usuario.ModoZen,
		&usuario.Status,
		&usuario.CriadoEm,
	); erro != nil {
		return erro
	}
	if image.Valid {
		usuario.Image = image.String
	}
	return nil
}

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
		"INSERT INTO usuarios (nome, nick, email, senha, status, image_url) VALUES ($1, $2, $3, $4, $5, NULLIF($6, '')) RETURNING id",
		usuario.Nome,
		usuario.Nick,
		usuario.Email,
		usuario.Senha,
		"ativo",
		usuario.Image,
	).Scan(&id)
	if erro != nil {
		return 0, erro
	}

	return uint64(id), nil
}

// Buscar tras todos os usuários que correspondem ao nome ou nick fornecido, retornando uma lista de usuários e um erro, se houver.
func (repositorio Usuarios) Buscar(nomeOuNick string) ([]modelos.Usuario, error) {
	nomeOuNick = fmt.Sprintf("%%%s%%", nomeOuNick)

	linhas, erro := repositorio.db.Query(
		fmt.Sprintf("SELECT %s FROM usuarios WHERE (nome ILIKE $1 OR nick ILIKE $1) AND status = 'ativo'", colunasUsuario),
		nomeOuNick)
	if erro != nil {
		return nil, erro
	}
	defer linhas.Close()

	usuarios := make([]modelos.Usuario, 0)
	for linhas.Next() {
		var usuario modelos.Usuario
		if erro = scanUsuario(linhas, &usuario); erro != nil {
			return nil, erro
		}

		usuarios = append(usuarios, usuario)
	}

	return usuarios, nil
}

// BuscarTodos retorna todos os usuários (ativos e inativos) para o painel admin.
func (repositorio Usuarios) BuscarTodos() ([]modelos.Usuario, error) {
	linhas, erro := repositorio.db.Query(
		fmt.Sprintf("SELECT %s FROM usuarios ORDER BY id", colunasUsuario),
	)
	if erro != nil {
		return nil, erro
	}
	defer linhas.Close()

	usuarios := make([]modelos.Usuario, 0)
	for linhas.Next() {
		var usuario modelos.Usuario
		if erro = scanUsuario(linhas, &usuario); erro != nil {
			return nil, erro
		}
		usuarios = append(usuarios, usuario)
	}

	return usuarios, nil
}

// BuscarPorID trás um usuário específico do banco de dados, com base no ID fornecido, retornando o usuário e um erro, se houver.
func (repositorio Usuarios) BuscarPorID(usuarioID uint64) (modelos.Usuario, error) {
	linhas, erro := repositorio.db.Query(
		fmt.Sprintf("SELECT %s FROM usuarios WHERE id = $1", colunasUsuario),
		usuarioID)
	if erro != nil {
		return modelos.Usuario{}, erro
	}
	defer linhas.Close()

	var usuario modelos.Usuario
	if linhas.Next() {
		if erro = scanUsuario(linhas, &usuario); erro != nil {
			return modelos.Usuario{}, erro
		}
	}

	return usuario, nil
}

// BuscarPorNick busca um usuário pelo nick (case insensitive).
func (repositorio Usuarios) BuscarPorNick(nick string) (modelos.Usuario, error) {
	linhas, erro := repositorio.db.Query(
		fmt.Sprintf("SELECT %s FROM usuarios WHERE LOWER(nick) = LOWER($1)", colunasUsuario),
		nick,
	)
	if erro != nil {
		return modelos.Usuario{}, erro
	}
	defer linhas.Close()

	var usuario modelos.Usuario
	if linhas.Next() {
		if erro = scanUsuario(linhas, &usuario); erro != nil {
			return modelos.Usuario{}, erro
		}
	}

	return usuario, nil
}

// Atualizar é a função responsável por atualizar um usuário específico no banco de dados, com base no ID fornecido, retornando um erro, se houver.
func (repositorio Usuarios) Atualizar(usuarioID uint64, usuario modelos.Usuario) error {
	statement, erro := repositorio.db.Prepare(
		"UPDATE usuarios SET nome = $1, nick = $2, email = $3, image_url = NULLIF($4, '') WHERE id = $5",
	)
	if erro != nil {
		return erro
	}
	defer statement.Close()

	if _, erro = statement.Exec(
		usuario.Nome,
		usuario.Nick,
		usuario.Email,
		usuario.Image,
		usuarioID,
	); erro != nil {
		return erro
	}

	return nil
}

// AtualizarAdmin atualiza perfil, status e flag de admin (painel administrativo).
func (repositorio Usuarios) AtualizarAdmin(usuarioID uint64, usuario modelos.Usuario) error {
	statement, erro := repositorio.db.Prepare(
		"UPDATE usuarios SET nome = $1, nick = $2, email = $3, image_url = NULLIF($4, ''), status = $5, is_admin = $6 WHERE id = $7",
	)
	if erro != nil {
		return erro
	}
	defer statement.Close()

	if _, erro = statement.Exec(
		usuario.Nome,
		usuario.Nick,
		usuario.Email,
		usuario.Image,
		usuario.Status,
		usuario.IsAdmin,
		usuarioID,
	); erro != nil {
		return erro
	}

	return nil
}

// CriarAdmin cadastra usuário com opção de definir is_admin.
func (repositorio Usuarios) CriarAdmin(usuario modelos.Usuario, isAdmin bool) (uint64, error) {
	var id uint64

	erro := repositorio.db.QueryRow(
		"INSERT INTO usuarios (nome, nick, email, senha, status, image_url, is_admin) VALUES ($1, $2, $3, $4, $5, NULLIF($6, ''), $7) RETURNING id",
		usuario.Nome,
		usuario.Nick,
		usuario.Email,
		usuario.Senha,
		"ativo",
		usuario.Image,
		isAdmin,
	).Scan(&id)
	if erro != nil {
		return 0, erro
	}

	return id, nil
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
		"SELECT id, senha, status, is_admin FROM usuarios WHERE email = $1",
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
			&usuario.Status,
			&usuario.IsAdmin,
		); erro != nil {
			return modelos.Usuario{}, erro
		}
	}

	return usuario, nil
}

// Seguir é a função responsável por permitir que um usuário siga outro usuário, com base nos IDs fornecidos, retornando um erro, se houver.
func (repositorio Usuarios) Seguir(IDSeguido, IDSeguidor uint64) error {
	statement, erro := repositorio.db.Prepare(
		"INSERT INTO seguidores (id_seguido, id_seguidor) VALUES ($1,$2) ON CONFLICT (id_seguido, id_seguidor) DO NOTHING",
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
		`SELECT u.id, u.nome, u.nick, u.image_url, u.rank_confiabilidade, u.sequencia_atual
		FROM usuarios u
		INNER JOIN seguidores s ON u.id = s.id_seguidor
		WHERE s.id_seguido = $1 AND u.status = 'ativo'
		`,
		IDSeguido)
	if erro != nil {
		return nil, erro
	}
	defer linhas.Close()

	var usuarios []modelos.Usuario
	for linhas.Next() {
		var usuario modelos.Usuario
		var image sql.NullString
		if erro = linhas.Scan(
			&usuario.ID,
			&usuario.Nome,
			&usuario.Nick,
			&image,
			&usuario.RankConfiabilidade,
			&usuario.SequenciaAtual,
		); erro != nil {
			return nil, erro
		}
		if image.Valid {
			usuario.Image = image.String
		}
		usuarios = append(usuarios, usuario)
	}

	return usuarios, nil
}

// BuscarSeguindo é a função responsável por buscar os usuários que um usuário específico está seguindo, com base no ID fornecido, retornando uma lista de usuários e um erro, se houver.
func (repositorio Usuarios) BuscarSeguindo(IDSeguido uint64) ([]modelos.Usuario, error) {
	linhas, erro := repositorio.db.Query(
		`SELECT u.id, u.nome, u.nick, u.image_url, u.rank_confiabilidade, u.sequencia_atual
		FROM usuarios u
		INNER JOIN seguidores s ON u.id = s.id_seguido
		WHERE s.id_seguidor = $1 AND u.status = 'ativo'
		`,
		IDSeguido)
	if erro != nil {
		return nil, erro
	}
	defer linhas.Close()

	var usuarios []modelos.Usuario
	for linhas.Next() {
		var usuario modelos.Usuario
		var image sql.NullString
		if erro = linhas.Scan(
			&usuario.ID,
			&usuario.Nome,
			&usuario.Nick,
			&image,
			&usuario.RankConfiabilidade,
			&usuario.SequenciaAtual,
		); erro != nil {
			return nil, erro
		}
		if image.Valid {
			usuario.Image = image.String
		}
		usuarios = append(usuarios, usuario)
	}

	return usuarios, nil
}

// BuscarSenha é a função responsável por buscar a senha de um usuário específico no banco de dados, com base no ID fornecido, retornando a senha e um erro, se houver.
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

// AtualizarSenha é a função responsável por atualizar a senha de um usuário específico no banco de dados, com base no ID fornecido, retornando um erro, se houver.
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

// IsAdmin é a função responsável por verificar se um usuário específico é um administrador, com base no ID fornecido, retornando um booleano e um erro, se houver.
func (repositorio Usuarios) IsAdmin(usuarioID uint64) (bool, error) {
	linha, erro := repositorio.db.Query(
		"SELECT is_admin FROM usuarios WHERE id = $1",
		usuarioID)
	if erro != nil {
		return false, erro
	}
	defer linha.Close()

	var usuario modelos.Usuario
	if linha.Next() {
		if erro = linha.Scan(
			&usuario.IsAdmin,
		); erro != nil {
			return false, erro
		}
	}
	return usuario.IsAdmin, nil
}

// AtualizarStatus é a função responsável por atualizar o status de um usuário específico no banco de dados, com base no ID fornecido, retornando um erro, se houver.
func (repositorio Usuarios) AtualizarStatus(usuarioID uint64, status string) error {
	statement, erro := repositorio.db.Prepare(
		"UPDATE usuarios SET status = $1 WHERE id = $2",
	)
	if erro != nil {
		return erro
	}
	defer statement.Close()
	if _, erro = statement.Exec(status, usuarioID); erro != nil {
		return erro
	}
	return nil
}

// AtualizarRank ajusta o rank de confiabilidade do autor dentro de uma transação.
func (repositorio Usuarios) AtualizarRank(tx *sql.Tx, usuarioID uint64, delta int) error {
	if delta == 0 {
		return nil
	}
	_, erro := tx.Exec(
		`UPDATE usuarios SET rank_confiabilidade = GREATEST(0, rank_confiabilidade + $1) WHERE id = $2`,
		delta, usuarioID,
	)
	return erro
}

func (repositorio Usuarios) AtualizarSequencia(tx *sql.Tx, usuarioID uint64, sequencia int) error {
	_, erro := tx.Exec(
		`UPDATE usuarios
		 SET sequencia_atual = $1,
		     maior_sequencia = GREATEST(maior_sequencia, $1)
		 WHERE id = $2`,
		sequencia,
		usuarioID,
	)
	return erro
}

func (repositorio Usuarios) PesquisarGlobal(termo string, limite int) ([]modelos.UsuarioPesquisa, error) {
	padrao := "%" + termo + "%"
	linhas, erro := repositorio.db.Query(
		`SELECT id, nome, nick, image_url FROM usuarios
		 WHERE (nome ILIKE $1 OR nick ILIKE $1) AND status = 'ativo'
		 LIMIT $2`,
		padrao, limite,
	)
	if erro != nil {
		return nil, erro
	}
	defer linhas.Close()

	resultado := make([]modelos.UsuarioPesquisa, 0)
	for linhas.Next() {
		var u modelos.UsuarioPesquisa
		var image sql.NullString
		if erro := linhas.Scan(&u.ID, &u.Nome, &u.Nick, &image); erro != nil {
			return nil, erro
		}
		if image.Valid {
			u.Image = image.String
		}
		resultado = append(resultado, u)
	}
	return resultado, nil
}
