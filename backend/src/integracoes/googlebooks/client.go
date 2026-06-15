package googlebooks

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
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

type volumesResponse struct {
	Items []volumeItem `json:"items"`
}

type volumeItem struct {
	ID         string     `json:"id"`
	VolumeInfo volumeInfo `json:"volumeInfo"`
}

type volumeInfo struct {
	Title               string               `json:"title"`
	Authors             []string             `json:"authors"`
	Publisher           string               `json:"publisher"`
	Description         string               `json:"description"`
	PageCount           int                  `json:"pageCount"`
	PrintedPageCount    int                  `json:"printedPageCount"`
	PublishedDate       string               `json:"publishedDate"`
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

func (c *Client) Buscar(q string, max int) ([]volumeItem, error) {
	if max <= 0 {
		max = 10
	}

	params := url.Values{}
	params.Set("q", q)
	params.Set("maxResults", strconv.Itoa(max))
	params.Set("printType", "books")
	if config.GoogleBooksAPIKey != "" {
		params.Set("key", config.GoogleBooksAPIKey)
	}

	reqURL := fmt.Sprintf("%s?%s", baseURL, params.Encode())
	resp, erro := c.httpClient.Get(reqURL)
	if erro != nil {
		return nil, erro
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
		return []volumeItem{}, nil
	}

	return resultado.Items, nil
}

func (c *Client) BuscarPorVolumeID(volumeID string) (volumeItem, error) {
	params := url.Values{}
	if config.GoogleBooksAPIKey != "" {
		params.Set("key", config.GoogleBooksAPIKey)
	}

	reqURL := fmt.Sprintf("%s/%s?%s", baseURL, url.PathEscape(volumeID), params.Encode())
	resp, erro := c.httpClient.Get(reqURL)
	if erro != nil {
		return volumeItem{}, erro
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return volumeItem{}, fmt.Errorf("volume não encontrado no Google Books")
	}

	if resp.StatusCode != http.StatusOK {
		corpo, _ := io.ReadAll(resp.Body)
		return volumeItem{}, fmt.Errorf("google books retornou %d: %s", resp.StatusCode, string(corpo))
	}

	var item volumeItem
	if erro = json.NewDecoder(resp.Body).Decode(&item); erro != nil {
		return volumeItem{}, erro
	}

	return item, nil
}
