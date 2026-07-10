package upload

import (
	"backend/src/config"
	"bytes"
	"errors"
	"fmt"
	"image"
	"image/draw"
	_ "image/gif"
	_ "image/jpeg"
	"image/png"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
	_ "golang.org/x/image/webp"
)

var extensoesPermitidas = map[string]bool{
	".jpg":  true,
	".jpeg": true,
	".png":  true,
	".webp": true,
	".gif":  true,
}

const tamanhoMaximo = 5 << 20 // 5MB

func detectarExtensaoPorAssinatura(arquivo multipart.File) (string, bool) {
	if arquivo == nil {
		return "", false
	}

	var cabecalho [32]byte
	n, erro := arquivo.Read(cabecalho[:])
	if _, erroSeek := arquivo.Seek(0, io.SeekStart); erroSeek != nil {
		return "", false
	}
	if erro != nil && erro != io.EOF {
		return "", false
	}
	b := cabecalho[:n]
	if len(b) >= 6 && (bytes.Equal(b[:6], []byte("GIF87a")) || bytes.Equal(b[:6], []byte("GIF89a"))) {
		return ".gif", true
	}
	if len(b) >= 8 && bytes.Equal(b[:8], []byte{0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A}) {
		return ".png", true
	}
	if len(b) >= 3 && b[0] == 0xFF && b[1] == 0xD8 && b[2] == 0xFF {
		return ".jpg", true
	}
	if len(b) >= 12 && bytes.Equal(b[:4], []byte("RIFF")) && bytes.Equal(b[8:12], []byte("WEBP")) {
		return ".webp", true
	}
	return "", false
}

func resolverExtensao(arquivo multipart.File, header *multipart.FileHeader) (string, error) {
	if extMagic, ok := detectarExtensaoPorAssinatura(arquivo); ok {
		return extMagic, nil
	}

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

	extensao, erro := resolverExtensao(arquivo, header)
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

	extensao, erro := resolverExtensao(arquivo, header)
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

	if _, erro = io.Copy(destino, arquivo); erro != nil {
		destino.Close()
		return "", erro
	}
	if erro = destino.Sync(); erro != nil {
		destino.Close()
		return "", erro
	}
	if erro = destino.Close(); erro != nil {
		return "", erro
	}

	if pasta == "avatars" && (extensao == ".gif" || extensao == ".webp") {
		previewPath := strings.TrimSuffix(caminhoCompleto, extensao) + ".still.png"
		if erro := GerarPreviewEstatico(caminhoCompleto, previewPath); erro != nil {
			// Falha no preview não impede upload do avatar principal.
			fmt.Printf("aviso: falha ao gerar preview estático de avatar (%s): %v\n", nomeArquivo, erro)
		}
	}

	caminhoPublico := fmt.Sprintf("/uploads/%s/%s", pasta, nomeArquivo)
	return config.URLPublica(caminhoPublico), nil
}

// GerarPreviewEstatico decodifica qualquer imagem suportada (GIF/WEBP/PNG/JPEG)
// e grava o primeiro quadro como PNG estático.
func GerarPreviewEstatico(caminhoOrigem string, caminhoPreview string) error {
	origem, erro := os.Open(caminhoOrigem)
	if erro != nil {
		return erro
	}
	defer origem.Close()

	decodada, _, erro := image.Decode(origem)
	if erro != nil {
		return erro
	}

	dst := image.NewNRGBA(decodada.Bounds())
	draw.Draw(dst, decodada.Bounds(), decodada, decodada.Bounds().Min, draw.Src)

	previewFile, erro := os.Create(caminhoPreview)
	if erro != nil {
		return erro
	}
	defer previewFile.Close()

	return png.Encode(previewFile, dst)
}

// GerarPreviewEstaticaGif mantém o nome antigo usado por callers; delega ao decoder genérico.
func GerarPreviewEstaticaGif(caminhoGif string, caminhoPreview string) error {
	return GerarPreviewEstatico(caminhoGif, caminhoPreview)
}
