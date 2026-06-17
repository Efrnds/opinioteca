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

// SalvarAvatar salva a imagem em uploads/avatars e retorna a URL pública.
func SalvarAvatar(arquivo multipart.File, header *multipart.FileHeader) (string, error) {
	defer arquivo.Close()

	if header.Size > tamanhoMaximo {
		return "", errors.New("A imagem deve ter no máximo 5MB")
	}

	extensao := strings.ToLower(filepath.Ext(header.Filename))
	if !extensoesPermitidas[extensao] {
		return "", errors.New("Formato de imagem não suportado. Use JPG, PNG, WEBP ou GIF")
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
