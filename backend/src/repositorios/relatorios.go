package repositorios

import (
	"backend/src/modelos"
	"database/sql"
	"fmt"
	"strconv"
	"strings"
)

type Relatorios struct {
	db *sql.DB
}

func NovoRepositorioDeRelatorios(db *sql.DB) *Relatorios {
	return &Relatorios{db}
}

func (repositorio Relatorios) ComentariosPorLivro(consulta string) ([]modelos.ComentarioRelatorioItem, error) {
	consulta = strings.TrimSpace(consulta)
	if consulta == "" {
		return nil, fmt.Errorf("consulta vazia")
	}

	query := `
		SELECT c.id, c.texto, c.criadoEm, u.nome, u.nick, l.titulo, cat.nome_categoria, c.avaliacao_id
		FROM comentarios c
		INNER JOIN usuarios u ON u.id = c.usuario_id
		INNER JOIN avaliacoes a ON a.id = c.avaliacao_id
		INNER JOIN livros l ON l.id = a.livro_id
		INNER JOIN categorias cat ON cat.id = l.categoria_id
		WHERE `

	args := []interface{}{}
	if id, erro := strconv.ParseUint(consulta, 10, 64); erro == nil {
		query += "l.id = $1"
		args = append(args, id)
	} else {
		query += "l.titulo ILIKE $1"
		args = append(args, "%"+consulta+"%")
	}

	query += " ORDER BY c.criadoEm DESC LIMIT 200"

	return repositorio.scanComentarios(query, args...)
}

func (repositorio Relatorios) ComentariosPorUsuario(consulta string) ([]modelos.ComentarioRelatorioItem, error) {
	consulta = strings.TrimSpace(consulta)
	if consulta == "" {
		return nil, fmt.Errorf("consulta vazia")
	}

	query := `
		SELECT c.id, c.texto, c.criadoEm, u.nome, u.nick, l.titulo, cat.nome_categoria, c.avaliacao_id
		FROM comentarios c
		INNER JOIN usuarios u ON u.id = c.usuario_id
		INNER JOIN avaliacoes a ON a.id = c.avaliacao_id
		INNER JOIN livros l ON l.id = a.livro_id
		INNER JOIN categorias cat ON cat.id = l.categoria_id
		WHERE `

	args := []interface{}{}
	if id, erro := strconv.ParseUint(consulta, 10, 64); erro == nil {
		query += "u.id = $1"
		args = append(args, id)
	} else if strings.Contains(consulta, "@") {
		query += "LOWER(u.email) = LOWER($1)"
		args = append(args, consulta)
	} else {
		query += "(LOWER(u.nick) = LOWER($1) OR u.nome ILIKE $2)"
		args = append(args, consulta, "%"+consulta+"%")
	}

	query += " ORDER BY c.criadoEm DESC LIMIT 200"

	return repositorio.scanComentarios(query, args...)
}

func (repositorio Relatorios) ComentariosPorCategoria(consulta string) ([]modelos.ComentarioRelatorioItem, error) {
	consulta = strings.TrimSpace(consulta)
	if consulta == "" {
		return nil, fmt.Errorf("consulta vazia")
	}

	query := `
		SELECT DISTINCT ON (c.id) c.id, c.texto, c.criadoEm, u.nome, u.nick, l.titulo, cat.nome_categoria, c.avaliacao_id
		FROM comentarios c
		INNER JOIN usuarios u ON u.id = c.usuario_id
		INNER JOIN avaliacoes a ON a.id = c.avaliacao_id
		INNER JOIN livros l ON l.id = a.livro_id
		INNER JOIN livro_categorias lc ON lc.livro_id = l.id
		INNER JOIN categorias cat ON cat.id = lc.categoria_id
		WHERE `

	args := []interface{}{}
	if id, erro := strconv.ParseUint(consulta, 10, 64); erro == nil {
		query += "lc.categoria_id = $1"
		args = append(args, id)
	} else {
		query += "cat.nome_categoria ILIKE $1"
		args = append(args, "%"+consulta+"%")
	}

	query += " ORDER BY c.id, c.criadoEm DESC LIMIT 200"

	return repositorio.scanComentarios(query, args...)
}

func (repositorio Relatorios) LivrosPorAutor(consulta string) ([]modelos.Livro, error) {
	consulta = strings.TrimSpace(consulta)
	if consulta == "" {
		return nil, fmt.Errorf("consulta vazia")
	}

	linhas, erro := repositorio.db.Query(
		selectLivro+` WHERE autor ILIKE $1 ORDER BY criadoEm DESC LIMIT 200`,
		"%"+consulta+"%",
	)
	if erro != nil {
		return nil, erro
	}
	defer linhas.Close()

	repoLivros := NovoRepositorioDeLivros(repositorio.db)
	livros := make([]modelos.Livro, 0)
	for linhas.Next() {
		livro, erro := repoLivros.scanLivro(linhas)
		if erro != nil {
			return nil, erro
		}
		livros = append(livros, livro)
	}
	return livros, nil
}

func (repositorio Relatorios) LivrosPorEditora(consulta string) ([]modelos.Livro, error) {
	consulta = strings.TrimSpace(consulta)
	if consulta == "" {
		return nil, fmt.Errorf("consulta vazia")
	}

	linhas, erro := repositorio.db.Query(
		selectLivro+` WHERE editora ILIKE $1 ORDER BY criadoEm DESC LIMIT 200`,
		"%"+consulta+"%",
	)
	if erro != nil {
		return nil, erro
	}
	defer linhas.Close()

	livros := make([]modelos.Livro, 0)
	for linhas.Next() {
		livro, erro := NovoRepositorioDeLivros(repositorio.db).scanLivro(linhas)
		if erro != nil {
			return nil, erro
		}
		livros = append(livros, livro)
	}
	return livros, nil
}

func (repositorio Relatorios) LivrosPorCategoria(consulta string) ([]modelos.Livro, error) {
	consulta = strings.TrimSpace(consulta)
	if consulta == "" {
		return nil, fmt.Errorf("consulta vazia")
	}

	query := `SELECT DISTINCT ON (livros.id) livros.id, livros.ISBN, livros.titulo, livros.editora, livros.categoria_id,
		livros.status, livros.paginas, livros.autor, livros.sinopse, livros.capa_url, livros.data_publicacao,
		livros.google_volume_id, livros.origem, livros.criadoEm
		FROM livros
		INNER JOIN livro_categorias lc ON lc.livro_id = livros.id
		INNER JOIN categorias cat ON cat.id = lc.categoria_id
		WHERE `
	args := []interface{}{}

	if id, erro := strconv.ParseUint(consulta, 10, 64); erro == nil {
		query += "lc.categoria_id = $1"
		args = append(args, id)
	} else {
		query += "cat.nome_categoria ILIKE $1"
		args = append(args, "%"+consulta+"%")
	}

	query += " ORDER BY livros.id, livros.criadoEm DESC LIMIT 200"

	linhas, erro := repositorio.db.Query(query, args...)
	if erro != nil {
		return nil, erro
	}
	defer linhas.Close()

	livros := make([]modelos.Livro, 0)
	for linhas.Next() {
		livro, erro := NovoRepositorioDeLivros(repositorio.db).scanLivro(linhas)
		if erro != nil {
			return nil, erro
		}
		livros = append(livros, livro)
	}
	return livros, nil
}

func (repositorio Relatorios) scanComentarios(query string, args ...interface{}) ([]modelos.ComentarioRelatorioItem, error) {
	linhas, erro := repositorio.db.Query(query, args...)
	if erro != nil {
		return nil, erro
	}
	defer linhas.Close()

	itens := make([]modelos.ComentarioRelatorioItem, 0)
	for linhas.Next() {
		var item modelos.ComentarioRelatorioItem
		if erro := linhas.Scan(
			&item.ID,
			&item.Texto,
			&item.CriadoEm,
			&item.UsuarioNome,
			&item.UsuarioNick,
			&item.LivroTitulo,
			&item.CategoriaNome,
			&item.AvaliacaoID,
		); erro != nil {
			return nil, erro
		}
		itens = append(itens, item)
	}
	return itens, nil
}
