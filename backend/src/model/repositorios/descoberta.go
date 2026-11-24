package repositorios

import (
	"backend/src/model/modelos"
	"database/sql"
	"fmt"
	"strings"
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
		`WITH popularidade AS (
            SELECT l.id,
                   LOWER(TRIM(REGEXP_REPLACE(l.titulo, '\s+', ' ', 'g'))) AS titulo_obra,
                   LOWER(TRIM(REGEXP_REPLACE(l.autor, '\s+', ' ', 'g'))) AS autor_obra,
                   COUNT(a.id) AS avaliacoes_recentes
            FROM livros l
            LEFT JOIN avaliacoes a ON a.livro_id = l.id AND a.criadoEm >= NOW() - INTERVAL '30 days'
            WHERE l.status = 'ativo'
            GROUP BY l.id
        ), obras AS (
            SELECT id,
                   SUM(avaliacoes_recentes) OVER (PARTITION BY titulo_obra, autor_obra) AS popularidade_obra,
                   ROW_NUMBER() OVER (
                       PARTITION BY titulo_obra, autor_obra
                       ORDER BY avaliacoes_recentes DESC, id DESC
                   ) AS posicao
            FROM popularidade
        )
        SELECT l.id, l.ISBN, l.titulo, l.editora, l.categoria_id, l.status, l.paginas, l.autor, l.sinopse,
               l.capa_url, l.data_publicacao, l.google_volume_id, l.origem, l.criadoEm
        FROM obras o
        JOIN livros l ON l.id = o.id
        WHERE o.posicao = 1
        ORDER BY o.popularidade_obra DESC, l.id DESC
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
	return livros, linhas.Err()
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

	cols := colunasUsuario(repositorio.db)
	// Prefixa com alias u. para o JOIN.
	partes := strings.Split(cols, ", ")
	for i, p := range partes {
		partes[i] = "u." + p
	}
	selectCols := strings.Join(partes, ", ")

	linhas, erro := repositorio.db.Query(
		fmt.Sprintf(`SELECT %s
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
		 LIMIT $2`, selectCols),
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
		if erro = scanUsuario(linhas, &usuario, repositorio.db); erro != nil {
			return nil, erro
		}
		usuarios = append(usuarios, usuario)
	}
	return usuarios, nil
}

// UsuariosPorRank lista críticos públicos ordenados pelo rank de confiabilidade.
func (repositorio Descoberta) UsuariosPorRank(limite int) ([]modelos.Usuario, error) {
	if limite <= 0 || limite > 50 {
		limite = 12
	}

	cols := colunasUsuario(repositorio.db)
	partes := strings.Split(cols, ", ")
	for i, p := range partes {
		partes[i] = "u." + p
	}
	selectCols := strings.Join(partes, ", ")

	linhas, erro := repositorio.db.Query(
		fmt.Sprintf(`SELECT %s
		 FROM usuarios u
		 LEFT JOIN usuario_configuracoes c ON c.usuario_id = u.id
		 WHERE u.status = 'ativo'
		   AND u.rank_confiabilidade > 0
		   AND COALESCE(c.visibilidade_perfil, 'publico') = 'publico'
		 ORDER BY u.rank_confiabilidade DESC, u.id ASC
		 LIMIT $1`, selectCols),
		limite,
	)
	if erro != nil {
		return nil, erro
	}
	defer linhas.Close()

	usuarios := make([]modelos.Usuario, 0)
	for linhas.Next() {
		var usuario modelos.Usuario
		if erro = scanUsuario(linhas, &usuario, repositorio.db); erro != nil {
			return nil, erro
		}
		usuarios = append(usuarios, usuario)
	}
	return usuarios, nil
}
