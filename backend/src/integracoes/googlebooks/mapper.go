package googlebooks

import (
	"errors"
	"strings"
	"time"

	"backend/src/modelos"
)

var ErrDadosInsuficientes = errors.New("Google Books não retornou título e autor")

func VolumeParaLivro(item VolumeItem) (modelos.Livro, error) {
	livro := modelos.Livro{
		GoogleVolumeID: item.ID,
		Origem:         "google_books",
		Status:         "ativo",
		Titulo:         strings.TrimSpace(item.VolumeInfo.Title),
		Editora:        strings.TrimSpace(item.VolumeInfo.Publisher),
		Sinopse:        strings.TrimSpace(item.VolumeInfo.Description),
		Paginas:        extrairPaginas(item.VolumeInfo),
		CapaURL:        httpsCapaURL(item.VolumeInfo.ImageLinks.Thumbnail),
	}

	if len(item.VolumeInfo.Authors) > 0 {
		livro.Autor = strings.TrimSpace(item.VolumeInfo.Authors[0])
	}

	livro.ISBN = extrairISBN(item.VolumeInfo.IndustryIdentifiers)

	if livro.Editora == "" {
		livro.Editora = "Desconhecida"
	}

	if data, ok := parsePublishedDate(item.VolumeInfo.PublishedDate); ok {
		livro.DataPublicacao = &data
	}

	if erro := livro.Preparar("importacao"); erro != nil {
		return modelos.Livro{}, erro
	}

	return livro, nil
}

func VolumeParaLivroBusca(item VolumeItem) (modelos.LivroBusca, error) {
	livro := modelos.LivroBusca{
		Origem:         "google",
		GoogleVolumeID: item.ID,
		Titulo:         strings.TrimSpace(item.VolumeInfo.Title),
		Paginas:        extrairPaginas(item.VolumeInfo),
		Editora:        strings.TrimSpace(item.VolumeInfo.Publisher),
		Sinopse:        strings.TrimSpace(item.VolumeInfo.Description),
		CapaURL:        httpsCapaURL(item.VolumeInfo.ImageLinks.Thumbnail),
	}

	if len(item.VolumeInfo.Authors) > 0 {
		livro.Autor = strings.TrimSpace(item.VolumeInfo.Authors[0])
	}

	livro.ISBN = extrairISBN(item.VolumeInfo.IndustryIdentifiers)

	if livro.Titulo == "" || livro.Autor == "" {
		return modelos.LivroBusca{}, ErrDadosInsuficientes
	}

	return livro, nil
}

// httpsCapaURL normaliza capas do Google Books (API costuma devolver http://).
func httpsCapaURL(raw string) string {
	url := strings.TrimSpace(raw)
	if strings.HasPrefix(url, "http://") {
		return "https://" + strings.TrimPrefix(url, "http://")
	}
	return url
}

func extrairISBN(identifiers []industryIdentifier) string {
	for _, id := range identifiers {
		if id.Type == "ISBN_13" {
			return strings.TrimSpace(id.Identifier)
		}
	}
	for _, id := range identifiers {
		if id.Type == "ISBN_10" {
			return strings.TrimSpace(id.Identifier)
		}
	}
	return ""
}

func parsePublishedDate(raw string) (time.Time, bool) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return time.Time{}, false
	}

	formatos := []string{"2006-01-02", "2006-01", "2006"}
	for _, formato := range formatos {
		if data, erro := time.Parse(formato, raw); erro == nil {
			return data, true
		}
	}

	return time.Time{}, false
}
