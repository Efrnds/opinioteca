package controllers

import (
	"backend/src/auth"
	"backend/src/banco"
	"backend/src/modelos"
	"backend/src/repositorios"
	"backend/src/respostas"
	"backend/src/upload"
	"errors"
	"io"
	"mime/multipart"
	"net/http"
	"path/filepath"
	"strings"
)

type uploadResposta struct {
	URL string `json:"url"`
}

func arquivoEhGIF(arquivo multipart.File, header *multipart.FileHeader) bool {
	if arquivo != nil {
		var cabecalho [6]byte
		n, erro := arquivo.Read(cabecalho[:])
		_, _ = arquivo.Seek(0, io.SeekStart)
		if erro == nil || erro == io.EOF {
			if n >= 6 {
				magic := string(cabecalho[:6])
				if magic == "GIF87a" || magic == "GIF89a" {
					return true
				}
			}
		}
	}

	if strings.EqualFold(filepath.Ext(header.Filename), ".gif") {
		return true
	}
	contentType := strings.ToLower(header.Header.Get("Content-Type"))
	return strings.Contains(contentType, "image/gif")
}

func arquivoEhWebPAnimado(arquivo multipart.File) bool {
	if arquivo == nil {
		return false
	}
	buf := make([]byte, 256)
	n, erro := arquivo.Read(buf)
	_, _ = arquivo.Seek(0, io.SeekStart)
	if erro != nil && erro != io.EOF {
		return false
	}
	if n < 16 || string(buf[0:4]) != "RIFF" || string(buf[8:12]) != "WEBP" {
		return false
	}
	amostra := string(buf[:n])
	if strings.Contains(amostra, "ANIM") || strings.Contains(amostra, "ANMF") {
		return true
	}
	// VP8X: bit 1 do byte de flags indica animação.
	if n >= 21 && string(buf[12:16]) == "VP8X" {
		return buf[20]&0x02 != 0
	}
	return false
}

func arquivoEhAvatarAnimado(arquivo multipart.File, header *multipart.FileHeader) bool {
	return arquivoEhGIF(arquivo, header) || arquivoEhWebPAnimado(arquivo)
}

// UploadAvatar recebe uma imagem e salva em uploads/avatars.
func UploadAvatar(w http.ResponseWriter, r *http.Request) {
	if erro := r.ParseMultipartForm(5 << 20); erro != nil {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}

	arquivo, header, erro := r.FormFile("imagem")
	if erro != nil {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}

	if arquivoEhAvatarAnimado(arquivo, header) {
		usuarioID, erroAuth := auth.ExtrairUsuarioID(r)
		if erroAuth != nil {
			respostas.Erro(w, http.StatusUnauthorized, errors.New("Faça login para enviar avatar animado"))
			return
		}

		db, erro := banco.Conectar()
		if erro != nil {
			respostas.Erro(w, http.StatusInternalServerError, erro)
			return
		}
		defer db.Close()

		usuario, erro := repositorios.NovoRepositorioDeUsuarios(db).BuscarPorID(usuarioID)
		if erro != nil || !modelos.TemPlanoPro(usuario) {
			respostas.Erro(w, http.StatusForbidden, errors.New("Avatar animado (GIF/WebP) é exclusivo do OpinioPro"))
			return
		}
	}

	url, erro := upload.SalvarAvatar(arquivo, header)
	if erro != nil {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}

	respostas.JSON(w, http.StatusCreated, uploadResposta{URL: url})
}

// UploadBanner recebe uma imagem de capa e salva em uploads/banners.
func UploadBanner(w http.ResponseWriter, r *http.Request) {
	if erro := r.ParseMultipartForm(5 << 20); erro != nil {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}

	arquivo, header, erro := r.FormFile("imagem")
	if erro != nil {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}

	url, erro := upload.SalvarBanner(arquivo, header)
	if erro != nil {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}

	respostas.JSON(w, http.StatusCreated, uploadResposta{URL: url})
}

// UploadAnexo salva imagem em uploads/anexos (sem gate Pro de avatar animado).
func UploadAnexo(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 6<<20)
	if erro := r.ParseMultipartForm(5 << 20); erro != nil {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}

	arquivo, header, erro := r.FormFile("imagem")
	if erro != nil {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}

	url, erro := upload.SalvarAnexo(arquivo, header)
	if erro != nil {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}

	respostas.JSON(w, http.StatusCreated, uploadResposta{URL: url})
}
