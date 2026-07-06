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
	defer arquivo.Close()

	if header.Size > tamanhoMaximo {
		return "", errors.New("A imagem deve ter no máximo 5MB")
	}

	extensao, erro := resolverExtensao(header)
	if erro != nil {
		return "", erro
	}

	pastaAvatars := filepath.Join(config.UploadsDir, "avatars")
	if erro := os.MkdirAll(pastaAvatars, 0755); erro != nil {
		return "", erro
	}

	nomeArquivo := uuid.New().String() + extensao
	caminhoCompleto := filepath.Join(pastaAvatars, nomeArquivo)

	destino, erro := os.Create(caminhoCompleto)
	if erro != nil {
		return "", erro
	}
	defer destino.Close()

	if _, erro = io.Copy(destino, arquivo); erro != nil {
		return "", erro
	}

	caminhoPublico := fmt.Sprintf("/uploads/avatars/%s", nomeArquivo)
	return config.URLPublica(caminhoPublico), nil
}
