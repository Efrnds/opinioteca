package modelos

import (
	"backend/src/config"
	"errors"
	"net/url"
	"path"
	"strings"
)

func esquemaPerigoso(raw string) bool {
	lower := strings.ToLower(strings.TrimSpace(raw))
	return strings.HasPrefix(lower, "javascript:") ||
		strings.HasPrefix(lower, "data:") ||
		strings.HasPrefix(lower, "vbscript:")
}

func hostGiphyPermitido(host string) bool {
	h := strings.ToLower(host)
	return h == "giphy.com" || h == "media.giphy.com" || h == "i.giphy.com" ||
		strings.HasSuffix(h, ".giphy.com")
}

func caminhoUploadLimpo(caminho string) (string, error) {
	limpo := path.Clean("/" + strings.TrimPrefix(caminho, "/"))
	if limpo == "/" || strings.Contains(limpo, "..") {
		return "", errors.New("URL de anexo inválida")
	}
	if !strings.HasPrefix(limpo, "/uploads/") {
		return "", errors.New("Anexo deve ser um arquivo enviado à Opinoteca")
	}
	return limpo, nil
}

func hostAnexoPermitido(host string) bool {
	host = strings.ToLower(host)
	if host == "localhost" || host == "127.0.0.1" {
		// Só em desenvolvimento / API local.
		base := strings.TrimRight(config.APIPublicURL, "/")
		if base == "" {
			return true
		}
		baseURL, erro := url.Parse(base)
		if erro != nil || baseURL.Hostname() == "" {
			return true
		}
		bh := strings.ToLower(baseURL.Hostname())
		return bh == "localhost" || bh == "127.0.0.1"
	}

	base := strings.TrimRight(config.APIPublicURL, "/")
	if base == "" {
		return true
	}
	baseURL, erro := url.Parse(base)
	if erro != nil || baseURL.Host == "" {
		return true
	}
	return strings.EqualFold(host, baseURL.Hostname())
}

// ValidarURLAnexo aceita uploads da Opinoteca ou GIFs do Giphy.
func ValidarURLAnexo(raw string) error {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil
	}
	if esquemaPerigoso(raw) {
		return errors.New("URL de anexo inválida")
	}

	if strings.HasPrefix(raw, "/uploads/") {
		_, erro := caminhoUploadLimpo(raw)
		return erro
	}

	parsed, erro := url.Parse(raw)
	if erro != nil || parsed.Scheme == "" || parsed.Host == "" {
		return errors.New("URL de anexo inválida")
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return errors.New("URL de anexo inválida")
	}

	if hostGiphyPermitido(parsed.Hostname()) {
		return nil
	}

	limpo, erro := caminhoUploadLimpo(parsed.Path)
	if erro != nil {
		return erro
	}
	_ = limpo

	if !hostAnexoPermitido(parsed.Hostname()) {
		return errors.New("Anexo deve ser um arquivo enviado à Opinoteca")
	}
	return nil
}

// ValidarURLMidiaPerfil aceita apenas arquivos em /uploads/avatars ou /uploads/banners.
func ValidarURLMidiaPerfil(raw string) error {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil
	}
	if esquemaPerigoso(raw) {
		return errors.New("URL de mídia inválida")
	}

	var caminho string
	if strings.HasPrefix(raw, "/uploads/") {
		limpo, erro := caminhoUploadLimpo(raw)
		if erro != nil {
			return errors.New("URL de mídia inválida")
		}
		caminho = limpo
	} else {
		parsed, erro := url.Parse(raw)
		if erro != nil || parsed.Scheme == "" || parsed.Host == "" {
			return errors.New("URL de mídia inválida")
		}
		if parsed.Scheme != "http" && parsed.Scheme != "https" {
			return errors.New("URL de mídia inválida")
		}
		limpo, erro := caminhoUploadLimpo(parsed.Path)
		if erro != nil {
			return errors.New("URL de mídia inválida")
		}
		if !hostAnexoPermitido(parsed.Hostname()) {
			return errors.New("URL de mídia inválida")
		}
		caminho = limpo
	}

	if !strings.HasPrefix(caminho, "/uploads/avatars/") &&
		!strings.HasPrefix(caminho, "/uploads/banners/") {
		return errors.New("Foto/banner deve ser um upload da Opinoteca")
	}
	return nil
}
