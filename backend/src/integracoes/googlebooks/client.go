package googlebooks

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"backend/src/config"
)

const baseURL = "https://www.googleapis.com/books/v1/volumes"

type Client struct {
	httpClient *http.Client
}

func NovoClient() *Client {
	return &Client{
		httpClient: &http.Client{Timeout: 10 * time.Second},
	}
}

type VolumeItem struct {
	ID         string     `json:"id"`
	VolumeInfo volumeInfo `json:"volumeInfo"`
}

type volumesResponse struct {
	Items []VolumeItem `json:"items"`
}

type volumeInfo struct {
	Title               string               `json:"title"`
	Authors             []string             `json:"authors"`
	Publisher           string               `json:"publisher"`
	Description         string               `json:"description"`
	PageCount           int                  `json:"pageCount"`
	PrintedPageCount    int                  `json:"printedPageCount"`
	PublishedDate       string               `json:"publishedDate"`
	AverageRating       float64              `json:"averageRating"`
	RatingsCount        int                  `json:"ratingsCount"`
	ImageLinks          imageLinks           `json:"imageLinks"`
	IndustryIdentifiers []industryIdentifier `json:"industryIdentifiers"`
}

type imageLinks struct {
	Thumbnail string `json:"thumbnail"`
}

type industryIdentifier struct {
	Type       string `json:"type"`
	Identifier string `json:"identifier"`
}

func (c *Client) Buscar(q string, max int) ([]VolumeItem, error) {
	if max <= 0 {
		max = 10
	}

	buscarAte := max
	if buscarAte < 25 {
		buscarAte = 25
	}

	queries := montarQueriesBusca(q)
	if len(queries) == 0 {
		return []VolumeItem{}, nil
	}

	type resultadoBusca struct {
		itens []VolumeItem
		erro  error
	}

	ch := make(chan resultadoBusca, len(queries))
	for _, query := range queries {
		go func(query string) {
			itens, erro := c.buscarRaw(query, buscarAte)
			ch <- resultadoBusca{itens: itens, erro: erro}
		}(query)
	}

	vistos := map[string]struct{}{}
	merged := make([]VolumeItem, 0, buscarAte*len(queries))
	var ultimoErro error

	for range queries {
		res := <-ch
		if res.erro != nil {
			ultimoErro = res.erro
			continue
		}
		for _, item := range res.itens {
			if _, ok := vistos[item.ID]; ok {
				continue
			}
			vistos[item.ID] = struct{}{}
			merged = append(merged, item)
		}
	}

	if len(merged) == 0 && ultimoErro != nil {
		return nil, ultimoErro
	}

	return merged, nil
}

// montarQueriesBusca monta buscas complementares no Google Books.
// Sempre inclui a consulta geral (títulos etc.) e uma busca inauthor,
// para sobrenomes como "marx" ou "kant" trazerem obras do autor, não só livros sobre ele.
func montarQueriesBusca(q string) []string {
	q = strings.TrimSpace(q)
	if q == "" {
		return nil
	}

	queries := []string{q}
	palavras := strings.Fields(q)

	if len(palavras) == 1 {
		queries = append(queries, "inauthor:"+q)
	} else {
		queries = append(queries, fmt.Sprintf(`inauthor:"%s"`, q))
		queries = append(queries, fmt.Sprintf(`intitle:"%s"`, q))
	}

	return queries
}

func (c *Client) buscarRaw(q string, max int) ([]VolumeItem, error) {
	if max <= 0 {
		max = 10
	}

	params := url.Values{}
	params.Set("q", q)
	params.Set("maxResults", strconv.Itoa(max))
	params.Set("printType", "books")
	params.Set("orderBy", "relevance")
	if config.GoogleBooksAPIKey != "" {
		params.Set("key", config.GoogleBooksAPIKey)
	}

	reqURL := fmt.Sprintf("%s?%s", baseURL, params.Encode())
	resp, erro := c.httpClient.Get(reqURL)
	if erro != nil {
		return nil, erroRequisicao(erro)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		corpo, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("google books retornou %d: %s", resp.StatusCode, string(corpo))
	}

	var resultado volumesResponse
	if erro = json.NewDecoder(resp.Body).Decode(&resultado); erro != nil {
		return nil, erro
	}

	if resultado.Items == nil {
		return []VolumeItem{}, nil
	}

	return resultado.Items, nil
}

func (c *Client) BuscarPorVolumeID(volumeID string) (VolumeItem, error) {
	params := url.Values{}
	if config.GoogleBooksAPIKey != "" {
		params.Set("key", config.GoogleBooksAPIKey)
	}

	reqURL := fmt.Sprintf("%s/%s?%s", baseURL, url.PathEscape(volumeID), params.Encode())
	resp, erro := c.httpClient.Get(reqURL)
	if erro != nil {
		return VolumeItem{}, erroRequisicao(erro)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return VolumeItem{}, fmt.Errorf("volume não encontrado no Google Books")
	}

	if resp.StatusCode != http.StatusOK {
		corpo, _ := io.ReadAll(resp.Body)
		return VolumeItem{}, fmt.Errorf("google books retornou %d: %s", resp.StatusCode, string(corpo))
	}

	var item VolumeItem
	if erro = json.NewDecoder(resp.Body).Decode(&item); erro != nil {
		return VolumeItem{}, erro
	}

	return item, nil
}

func erroRequisicao(erro error) error {
	msg := strings.ToLower(erro.Error())
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
			return fmt.Errorf("sem conexão com Google Books: %w", erro)
		}
	}
	return fmt.Errorf("falha na requisição ao Google Books: %w", erro)
}
