package servicos

import (
	"backend/src/integracoes/googlebooks"
	"backend/src/modelos"
	"backend/src/repositorios"
	"database/sql"
	"errors"
	"sort"
	"strconv"
	"strings"
)

const limiteBuscaLocal = 10
const limiteResultadoFinal = 15
const limitePoolGoogle = 25

type candidatoBusca struct {
	item  modelos.LivroBusca
	score int
}

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

	msg := strings.ToLower(erro.Error())

	if ehErroRede(msg) {
		return errors.New("Sem conexão com o Google Books. Verifique sua internet ou DNS e tente novamente.")
	}
	if strings.Contains(msg, "429") || strings.Contains(msg, "quota exceeded") {
		return errors.New("Limite da Google Books API atingido. Tente novamente mais tarde.")
	}
	if strings.Contains(msg, "403") {
		return errors.New("Google Books API recusou a requisição. Verifique se a Books API está ativada e se GOOGLE_BOOKS_API_KEY é válida.")
	}

	return errors.New("Não foi possível consultar o Google Books. Tente novamente em instantes.")
}

func avisoGoogle(erro error) string {
	if erro == nil {
		return ""
	}
	return erroGoogleAmigavel(erro).Error()
}

func ehErroRede(msg string) bool {
	indicadores := []string{
		"no such host",
		"connection refused",
		"connection reset",
		"i/o timeout",
		"timeout",
		"network is unreachable",
		"dial tcp",
		"tls handshake timeout",
		"server misbehaving",
		"temporary failure in name resolution",
	}
	for _, indicador := range indicadores {
		if strings.Contains(msg, indicador) {
			return true
		}
	}
	return false
}

func ordenarCandidatos(candidatos []candidatoBusca) {
	sort.SliceStable(candidatos, func(i, j int) bool {
		return candidatos[i].score > candidatos[j].score
	})
}

func limitarCandidatos(candidatos []candidatoBusca) []modelos.LivroBusca {
	ordenarCandidatos(candidatos)
	if len(candidatos) > limiteResultadoFinal {
		candidatos = candidatos[:limiteResultadoFinal]
	}
	resultado := make([]modelos.LivroBusca, len(candidatos))
	for i, c := range candidatos {
		resultado[i] = c.item
	}
	return resultado
}

func (s *Livros) BuscarUnificado(q string) (modelos.ResultadoBuscaLivros, error) {
	q = normalizarBusca(q)
	if q == "" {
		return modelos.ResultadoBuscaLivros{}, errors.New("Parâmetro q é obrigatório!")
	}

	locais, erro := s.repoLivros.BuscarTexto(q, limiteBuscaLocal)
	if erro != nil {
		return modelos.ResultadoBuscaLivros{}, erro
	}

	candidatos := make([]candidatoBusca, 0, limitePoolGoogle)
	isbnsVistos := map[string]bool{}
	volumesVistos := map[string]bool{}

	for _, livro := range locais {
		item := livro.ParaBusca()
		candidatos = append(candidatos, candidatoBusca{
			item:  item,
			score: googlebooks.RelevanciaLivro(item.Titulo, item.Autor, q, 15),
		})
		if livro.ISBN != "" {
			isbnsVistos[livro.ISBN] = true
		}
		if livro.GoogleVolumeID != "" {
			volumesVistos[livro.GoogleVolumeID] = true
		}
	}

	var aviso string
	quantidadeLocal := len(candidatos)
	volumes, erro := s.googleClient.Buscar(q, limitePoolGoogle)
	if erro != nil {
		if len(candidatos) == quantidadeLocal {
			aviso = avisoGoogle(erro)
		}
	} else {
		for _, volume := range volumes {
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
			candidatos = append(candidatos, candidatoBusca{
				item:  item,
				score: googlebooks.RelevanciaVolume(volume, q),
			})
		}
	}

	if aviso != "" && len(candidatos) == 0 {
		aviso += " Você pode cadastrar o livro manualmente."
	}

	return modelos.ResultadoBuscaLivros{
		Resultados: limitarCandidatos(candidatos),
		Aviso:      aviso,
	}, nil
}

func aplicarComplementos(livro *modelos.Livro, req modelos.CriarLivroUsuarioRequest) {
	if req.Titulo != "" {
		livro.Titulo = req.Titulo
	}
	if req.Autor != "" {
		livro.Autor = req.Autor
	}
	if req.Paginas > 0 {
		livro.Paginas = req.Paginas
	}
	if req.CapaURL != "" {
		livro.CapaURL = req.CapaURL
	}
	if req.ISBN != "" {
		livro.ISBN = req.ISBN
	}
	if categorias := req.CategoriasResolvidas(); len(categorias) > 0 {
		livro.CategoriasIDs = categorias
		livro.CategoriaID = categorias[0]
	} else if req.CategoriaID > 0 {
		livro.CategoriaID = req.CategoriaID
		livro.CategoriasIDs = []uint64{req.CategoriaID}
	}
}

func (s *Livros) categoriaOutrosID() (uint64, error) {
	categoria, erro := s.repoCategorias.BuscarPorNome("Outros")
	if erro != nil {
		return 0, errors.New("Categoria 'Outros' não encontrada. Execute o seed do banco.")
	}
	return categoria.ID, nil
}

func (s *Livros) resolverCategorias(req modelos.CriarLivroUsuarioRequest, atual uint64) ([]uint64, uint64, error) {
	if categorias := req.CategoriasResolvidas(); len(categorias) > 0 {
		return categorias, categorias[0], nil
	}
	if atual > 0 {
		return []uint64{atual}, atual, nil
	}

	outrosID, erro := s.categoriaOutrosID()
	if erro != nil {
		return nil, 0, errors.New("Selecione uma categoria para o livro.")
	}
	return []uint64{outrosID}, outrosID, nil
}

func (s *Livros) persistirCategorias(livroID uint64, categoriasIDs []uint64) error {
	if livroID == 0 || len(categoriasIDs) == 0 {
		return nil
	}
	return s.repoLivros.SubstituirCategorias(livroID, categoriasIDs)
}

func (s *Livros) finalizarLivro(livro *modelos.Livro, categoriasIDs []uint64) (modelos.Livro, error) {
	if erro := s.persistirCategorias(livro.ID, categoriasIDs); erro != nil {
		return modelos.Livro{}, erro
	}
	livro.CategoriasIDs = categoriasIDs
	if len(categoriasIDs) > 0 {
		livro.CategoriaID = categoriasIDs[0]
	}
	return *livro, nil
}

func (s *Livros) RegistrarLivroUsuario(req modelos.CriarLivroUsuarioRequest) (modelos.Livro, error) {
	if erro := req.Preparar(); erro != nil {
		return modelos.Livro{}, erro
	}

	if req.LivroID != nil && *req.LivroID > 0 {
		livro, erro := s.repoLivros.BuscarPorID(*req.LivroID)
		if erro == sql.ErrNoRows {
			return modelos.Livro{}, errors.New("Livro não encontrado")
		}
		if erro != nil {
			return modelos.Livro{}, erro
		}
		aplicarComplementos(&livro, req)
		categoriasIDs, _, erro := s.resolverCategorias(req, livro.CategoriaID)
		if erro != nil {
			return modelos.Livro{}, erro
		}
		livro.CategoriasIDs = categoriasIDs
		livro.CategoriaID = categoriasIDs[0]
		if erro = livro.Preparar("usuario"); erro != nil {
			return modelos.Livro{}, erro
		}
		if erro = s.repoLivros.Atualizar(livro.ID, livro); erro != nil {
			return modelos.Livro{}, erro
		}
		return s.finalizarLivro(&livro, categoriasIDs)
	}

	if req.GoogleVolumeID != "" {
		if existente, erro := s.repoLivros.BuscarPorGoogleVolumeID(req.GoogleVolumeID); erro == nil {
			aplicarComplementos(&existente, req)
			categoriasIDs, _, erro := s.resolverCategorias(req, existente.CategoriaID)
			if erro != nil {
				return modelos.Livro{}, erro
			}
			existente.CategoriasIDs = categoriasIDs
			existente.CategoriaID = categoriasIDs[0]
			if erro = existente.Preparar("usuario"); erro != nil {
				return modelos.Livro{}, erro
			}
			if erro = s.repoLivros.Atualizar(existente.ID, existente); erro != nil {
				return modelos.Livro{}, erro
			}
			return s.finalizarLivro(&existente, categoriasIDs)
		} else if erro != sql.ErrNoRows {
			return modelos.Livro{}, erro
		}

		categoriasIDs, categoriaPrincipal, erro := s.resolverCategorias(req, 0)
		if erro != nil {
			return modelos.Livro{}, erro
		}

		livro := modelos.Livro{
			GoogleVolumeID: req.GoogleVolumeID,
			Titulo:         req.Titulo,
			Autor:          req.Autor,
			Paginas:        req.Paginas,
			CapaURL:        req.CapaURL,
			ISBN:           req.ISBN,
			CategoriaID:    categoriaPrincipal,
			CategoriasIDs:  categoriasIDs,
			Status:         "ativo",
			Origem:         "manual",
			Editora:        "Desconhecida",
		}

		volume, erro := s.googleClient.BuscarPorVolumeID(req.GoogleVolumeID)
		if erro == nil {
			if volume, erro = s.googleClient.EnriquecerPaginas(volume); erro == nil {
				if importado, erro := googlebooks.VolumeParaLivro(volume); erro == nil {
					livro = importado
				}
			}
		}

		aplicarComplementos(&livro, req)
		categoriasIDs = livro.CategoriasResolvidas()
		if len(categoriasIDs) == 0 {
			categoriasIDs, categoriaPrincipal, erro = s.resolverCategorias(req, 0)
			if erro != nil {
				return modelos.Livro{}, erro
			}
			livro.CategoriasIDs = categoriasIDs
			livro.CategoriaID = categoriaPrincipal
		}
		if erro = livro.Preparar("usuario"); erro != nil {
			return modelos.Livro{}, erro
		}

		id, erro := s.repoLivros.UpsertGoogle(livro)
		if erro != nil {
			return modelos.Livro{}, erro
		}
		livro.ID = id
		return s.finalizarLivro(&livro, categoriasIDs)
	}

	categoriasIDs, categoriaPrincipal, erro := s.resolverCategorias(req, 0)
	if erro != nil {
		return modelos.Livro{}, erro
	}

	livro := modelos.Livro{
		Titulo:        req.Titulo,
		Autor:         req.Autor,
		Paginas:       req.Paginas,
		CapaURL:       req.CapaURL,
		ISBN:          req.ISBN,
		CategoriaID:   categoriaPrincipal,
		CategoriasIDs: categoriasIDs,
		Status:        "ativo",
		Origem:        "manual",
		Editora:       "Desconhecida",
	}
	aplicarComplementos(&livro, req)
	categoriasIDs = livro.CategoriasResolvidas()
	if len(categoriasIDs) > 0 {
		livro.CategoriaID = categoriasIDs[0]
	}
	if erro := livro.Preparar("usuario"); erro != nil {
		return modelos.Livro{}, erro
	}

	id, erro := s.repoLivros.Criar(livro)
	if erro != nil {
		return modelos.Livro{}, erro
	}
	livro.ID = id
	return s.finalizarLivro(&livro, categoriasIDs)
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

	categoriaOutros, erro := s.categoriaOutrosID()
	if erro != nil {
		return 0, erro
	}

	livroImportado, erro := googlebooks.VolumeParaLivro(volume)
	if erro != nil {
		return 0, erro
	}
	livroImportado.CategoriaID = categoriaOutros
	livroImportado.CategoriasIDs = []uint64{categoriaOutros}

	if livroImportado.ISBN != "" {
		existente, erro := s.repoLivros.BuscarPorISBN(livroImportado.ISBN)
		if erro == nil {
			return existente.ID, nil
		}
		if erro != sql.ErrNoRows {
			return 0, erro
		}
	}

	id, erro := s.repoLivros.UpsertGoogle(livroImportado)
	if erro != nil {
		return 0, erro
	}
	if erro = s.persistirCategorias(id, []uint64{categoriaOutros}); erro != nil {
		return 0, erro
	}
	return id, nil
}

func (s *Livros) ResolverLivroIDBanco(identificador string) (uint64, error) {
	identificador = strings.TrimSpace(identificador)
	if identificador == "" {
		return 0, errors.New("Identificador inválido")
	}

	if idNumerico, erro := strconv.ParseUint(identificador, 10, 64); erro == nil {
		livro, erro := s.repoLivros.BuscarPorID(idNumerico)
		if erro != nil {
			if erro == sql.ErrNoRows {
				return 0, errors.New("Livro não encontrado")
			}
			return 0, erro
		}
		return livro.ID, nil
	}

	livro, erro := s.repoLivros.BuscarPorGoogleVolumeID(identificador)
	if erro != nil {
		return 0, erro
	}
	return livro.ID, nil
}

func (s *Livros) BuscarPorGoogleVolume(volumeID string) (modelos.LivroBusca, error) {
	volumeID = strings.TrimSpace(volumeID)
	if volumeID == "" {
		return modelos.LivroBusca{}, errors.New("Volume inválido")
	}

	livro, erro := s.repoLivros.BuscarPorGoogleVolumeID(volumeID)
	if erro == nil {
		if erro = s.repoLivros.PreencherCategoriasLivro(&livro); erro != nil {
			return modelos.LivroBusca{}, erro
		}
		return livro.ParaBusca(), nil
	}
	if erro != sql.ErrNoRows {
		return modelos.LivroBusca{}, erro
	}

	volume, erro := s.googleClient.BuscarPorVolumeID(volumeID)
	if erro != nil {
		return modelos.LivroBusca{}, erroGoogleAmigavel(erro)
	}

	volume, erro = s.googleClient.EnriquecerPaginas(volume)
	if erro != nil {
		return modelos.LivroBusca{}, erro
	}

	return googlebooks.VolumeParaLivroBusca(volume)
}
