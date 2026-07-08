package repositorios

import (
	"backend/src/modelos"
	"database/sql"
)

type Descoberta struct {
	db *sql.DB
}

func NovoRepositorioDeDescoberta(db *sql.DB) *Descoberta {
	return &Descoberta{db}
}

func (repositorio Descoberta) LivrosEmAlta(limite int) ([]modelos.Livro, error) {
	if limite <= 0 || limite > 50 {
		limite = 12
	}

	linhas, erro := repositorio.db.Query(
		`SELECT l.id, l.ISBN, l.titulo, l.editora, l.categoria_id, l.status, l.paginas, l.autor, l.sinopse,
		        l.capa_url, l.data_publicacao, l.google_volume_id, l.origem, l.criadoEm
		 FROM livros l
		 LEFT JOIN avaliacoes a ON a.livro_id = l.id AND a.criadoEm >= NOW() - INTERVAL '30 days'
		 WHERE l.status = 'ativo'
		 GROUP BY l.id
		 ORDER BY COUNT(a.id) DESC, l.id DESC
		 LIMIT $1`,
		limite,
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

func (repositorio Descoberta) LivrosRecentes(limite int) ([]modelos.Livro, error) {
	if limite <= 0 || limite > 50 {
		limite = 12
	}

	linhas, erro := repositorio.db.Query(
		`SELECT id, ISBN, titulo, editora, categoria_id, status, paginas, autor, sinopse,
		        capa_url, data_publicacao, google_volume_id, origem, criadoEm
		 FROM livros
		 WHERE status = 'ativo'
		 ORDER BY criadoEm DESC
		 LIMIT $1`,
		limite,
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

func (repositorio Descoberta) UsuariosSugeridos(viewerID uint64, limite int) ([]modelos.Usuario, error) {
	if limite <= 0 || limite > 50 {
		limite = 12
	}

	linhas, erro := repositorio.db.Query(
		`SELECT u.id, u.nome, u.nick, u.email, u.image_url, u.rank_confiabilidade, u.assinatura_id,
		        u.is_admin, u.sequencia_atual, u.maior_sequencia, u.modo_zen, u.status, u.criadoEm, u.inativado_em
		 FROM usuarios u
		 LEFT JOIN usuario_configuracoes c ON c.usuario_id = u.id
		 WHERE u.status = 'ativo'
		   AND u.id <> $1
		   AND COALESCE(c.visibilidade_perfil, 'publico') = 'publico'
		   AND NOT EXISTS (
		       SELECT 1 FROM seguidores s
		       WHERE s.id_seguidor = $1 AND s.id_seguido = u.id
		   )
		 ORDER BY (
		     SELECT COUNT(*) FROM seguidores sg WHERE sg.id_seguido = u.id
		 ) DESC, u.rank_confiabilidade DESC, u.id DESC
		 LIMIT $2`,
		viewerID,
		limite,
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
