package controllers

import (
	"backend/src/auth"
	"backend/src/banco"
	"backend/src/modelos"
	"backend/src/repositorios"
	"backend/src/respostas"
	"backend/src/upload"
	"errors"
	"mime/multipart"
	"net/http"
	"path/filepath"
	"strings"
)

type uploadResposta struct {
	URL string `json:"url"`
}

func arquivoEhGIF(header *multipart.FileHeader) bool {
	if strings.EqualFold(filepath.Ext(header.Filename), ".gif") {
		return true
	}
	contentType := strings.ToLower(header.Header.Get("Content-Type"))
	return strings.Contains(contentType, "image/gif")
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

	if arquivoEhGIF(header) {
		usuarioID, erroAuth := auth.ExtrairUsuarioID(r)
		if erroAuth != nil {
			respostas.Erro(w, http.StatusUnauthorized, errors.New("Faça login para enviar GIF como foto de perfil"))
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
			respostas.Erro(w, http.StatusForbidden, errors.New("GIF como foto de perfil é exclusivo do OpinioPro"))
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
