package servicos

import (
	"backend/src/integracoes/googlebooks"
	"backend/src/modelos"
	"backend/src/repositorios"
	"database/sql"
	"errors"
	"fmt"
	"strings"
)

const limiteBuscaLocal = 10

type Livros struct {
	db             *sql.DB
	repoLivros     *repositorios.Livros
	repoCategorias *repositorios.Categorias
	googleClient   *googlebooks.Client
}

func NovoServicoLivros(db *sql.DB) *Livros {
	return &Livros{
		db:             db,
		repoLivros:     repositorios.NovoRepositorioDeLivros(db),
		repoCategorias: repositorios.NovoRepositorioDeCategorias(db),
		googleClient:   googlebooks.NovoClient(),
	}
}

func normalizarBusca(q string) string {
	q = strings.TrimSpace(q)
	q = strings.Trim(q, `"'`)
	return strings.TrimSpace(q)
}

func erroGoogleAmigavel(erro error) error {
	if erro == nil {
		return nil
	}
	msg := erro.Error()
	if strings.Contains(msg, "429") || strings.Contains(msg, "Quota exceeded") {
		return errors.New("Limite da Google Books API atingido. Configure GOOGLE_BOOKS_API_KEY no .env (Google Cloud Console → Books API → credenciais) e reinicie a API.")
	}
	if strings.Contains(msg, "403") {
		return errors.New("Google Books API recusou a requisição. Verifique se a Books API está ativada e se GOOGLE_BOOKS_API_KEY é válida.")
	}
	return fmt.Errorf("Erro ao consultar Google Books: %w", erro)
}

func (s *Livros) BuscarUnificado(q string) ([]modelos.LivroBusca, error) {
	q = normalizarBusca(q)
	if q == "" {
		return nil, errors.New("Parâmetro q é obrigatório!")
	}

	locais, erro := s.repoLivros.BuscarTexto(q, limiteBuscaLocal)
	if erro != nil {
		return nil, erro
	}

	resultado := make([]modelos.LivroBusca, 0, len(locais))
	isbnsVistos := map[string]bool{}
	volumesVistos := map[string]bool{}

	for _, livro := range locais {
		resultado = append(resultado, livro.ParaBusca())
		if livro.ISBN != "" {
			isbnsVistos[livro.ISBN] = true
		}
		if livro.GoogleVolumeID != "" {
			volumesVistos[livro.GoogleVolumeID] = true
		}
	}

	if len(locais) >= limiteBuscaLocal {
		return resultado, nil
	}

	volumes, erro := s.googleClient.Buscar(q, limiteBuscaLocal)
	if erro != nil {
		if len(resultado) == 0 {
			return nil, erroGoogleAmigavel(erro)
		}
		return resultado, nil
	}

	for _, volume := range volumes {
		volume, erro = s.googleClient.EnriquecerPaginas(volume)
		if erro != nil {
			continue
		}
		item, erro := googlebooks.VolumeParaLivroBusca(volume)
		if erro != nil {
			continue
		}
		if item.ISBN != "" && isbnsVistos[item.ISBN] {
			continue
		}
		if item.GoogleVolumeID != "" && volumesVistos[item.GoogleVolumeID] {
			continue
		}
		resultado = append(resultado, item)
	}

	return resultado, nil
}

func (s *Livros) ResolverLivro(livroID *uint64, googleVolumeID string) (uint64, error) {
	if livroID != nil && *livroID > 0 {
		livro, erro := s.repoLivros.BuscarPorID(*livroID)
		if erro == sql.ErrNoRows {
			return 0, errors.New("Livro não encontrado ou inativo")
		}
		if erro != nil {
			return 0, erro
		}
		return livro.ID, nil
	}

	googleVolumeID = strings.TrimSpace(googleVolumeID)
	if googleVolumeID == "" {
		return 0, errors.New("Informe livro_id ou google_volume_id!")
	}

	livro, erro := s.repoLivros.BuscarPorGoogleVolumeID(googleVolumeID)
	if erro == nil {
		return livro.ID, nil
	}
	if erro != sql.ErrNoRows {
		return 0, erro
	}

	volume, erro := s.googleClient.BuscarPorVolumeID(googleVolumeID)
	if erro != nil {
		return 0, erroGoogleAmigavel(erro)
	}

	volume, erro = s.googleClient.EnriquecerPaginas(volume)
	if erro != nil {
		return 0, erro
	}

	categoriaOutros, erro := s.repoCategorias.BuscarPorNome("Outros")
	if erro != nil {
		return 0, errors.New("Categoria 'Outros' não encontrada. Execute o seed do banco.")
	}

	livroImportado, erro := googlebooks.VolumeParaLivro(volume, categoriaOutros.ID)
	if erro != nil {
		return 0, erro
	}

	if livroImportado.ISBN != "" {
		existente, erro := s.repoLivros.BuscarPorISBN(livroImportado.ISBN)
		if erro == nil {
			return existente.ID, nil
		}
		if erro != sql.ErrNoRows {
			return 0, erro
		}
	}

	return s.repoLivros.UpsertGoogle(livroImportado)
}
