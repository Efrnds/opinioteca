package upload

import (
	"backend/src/config"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
)

var extensoesPermitidas = map[string]bool{
	".jpg":  true,
	".jpeg": true,
	".png":  true,
	".webp": true,
	".gif":  true,
}

const tamanhoMaximo = 5 << 20 // 5MB

func resolverExtensao(header *multipart.FileHeader) (string, error) {
	ext := strings.ToLower(filepath.Ext(header.Filename))
	if extensoesPermitidas[ext] {
		return ext, nil
	}

	contentType := strings.ToLower(header.Header.Get("Content-Type"))
	switch {
	case strings.Contains(contentType, "image/gif"):
		return ".gif", nil
	case strings.Contains(contentType, "image/png"):
		return ".png", nil
	case strings.Contains(contentType, "image/jpeg"), strings.Contains(contentType, "image/jpg"):
		return ".jpg", nil
	case strings.Contains(contentType, "image/webp"):
		return ".webp", nil
	}

	return "", errors.New("Formato de imagem não suportado. Use JPG, PNG, WEBP ou GIF")
}

// SalvarAvatar salva a imagem em uploads/avatars e retorna a URL pública.
func SalvarAvatar(arquivo multipart.File, header *multipart.FileHeader) (string, error) {
	return salvarImagem(arquivo, header, "avatars", tamanhoMaximo)
}

// SalvarBanner salva a imagem de capa em uploads/banners e retorna a URL pública.
// Aceita JPG, PNG e WEBP (sem GIF) até 5MB, idealmente landscape.
func SalvarBanner(arquivo multipart.File, header *multipart.FileHeader) (string, error) {
	defer arquivo.Close()

	if header.Size > tamanhoMaximo {
		return "", errors.New("A imagem do banner deve ter no máximo 5MB")
	}

	extensao, erro := resolverExtensao(header)
	if erro != nil {
		return "", erro
	}
	if extensao == ".gif" {
		return "", errors.New("GIF não é suportado no banner. Use JPG, PNG ou WEBP")
	}

	pastaBanners := filepath.Join(config.UploadsDir, "banners")
	if erro := os.MkdirAll(pastaBanners, 0755); erro != nil {
		return "", erro
	}

	nomeArquivo := uuid.New().String() + extensao
	caminhoCompleto := filepath.Join(pastaBanners, nomeArquivo)

	destino, erro := os.Create(caminhoCompleto)
	if erro != nil {
		return "", erro
	}
	defer destino.Close()

	if _, erro = io.Copy(destino, arquivo); erro != nil {
		return "", erro
	}

	caminhoPublico := fmt.Sprintf("/uploads/banners/%s", nomeArquivo)
	return config.URLPublica(caminhoPublico), nil
}

func salvarImagem(arquivo multipart.File, header *multipart.FileHeader, pasta string, maxBytes int64) (string, error) {
	defer arquivo.Close()

	if header.Size > maxBytes {
		return "", errors.New("A imagem deve ter no máximo 5MB")
	}

	extensao, erro := resolverExtensao(header)
	if erro != nil {
		return "", erro
	}

	pastaDestino := filepath.Join(config.UploadsDir, pasta)
	if erro := os.MkdirAll(pastaDestino, 0755); erro != nil {
		return "", erro
	}

	nomeArquivo := uuid.New().String() + extensao
	caminhoCompleto := filepath.Join(pastaDestino, nomeArquivo)

	destino, erro := os.Create(caminhoCompleto)
	if erro != nil {
		return "", erro
	}
	defer destino.Close()

	if _, erro = io.Copy(destino, arquivo); erro != nil {
		return "", erro
	}

	caminhoPublico := fmt.Sprintf("/uploads/%s/%s", pasta, nomeArquivo)
	return config.URLPublica(caminhoPublico), nil
}
