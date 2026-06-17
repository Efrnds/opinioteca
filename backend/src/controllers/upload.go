package controllers

import (
	"backend/src/respostas"
	"backend/src/upload"
	"net/http"
)

type uploadResposta struct {
	URL string `json:"url"`
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

	url, erro := upload.SalvarAvatar(arquivo, header)
	if erro != nil {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}

	respostas.JSON(w, http.StatusCreated, uploadResposta{URL: url})
}
