package controllers

import (
	"net/http"
	"strconv"
)

const (
	limitePadraoAdmin = 20
	limiteMaxAdmin    = 100
)

// paginacaoAdmin lê pagina/limite (ou page/pageSize, ou offset) da query.
// Retorna pagina (1-based), limite e offset.
func paginacaoAdmin(r *http.Request) (pagina, limite, offset int) {
	pagina = 1
	limite = limitePadraoAdmin

	if valor := r.URL.Query().Get("pagina"); valor != "" {
		if parsed, erro := strconv.Atoi(valor); erro == nil && parsed > 0 {
			pagina = parsed
		}
	} else if valor := r.URL.Query().Get("page"); valor != "" {
		if parsed, erro := strconv.Atoi(valor); erro == nil && parsed > 0 {
			pagina = parsed
		}
	}

	if valor := r.URL.Query().Get("limite"); valor != "" {
		if parsed, erro := strconv.Atoi(valor); erro == nil && parsed > 0 {
			limite = parsed
		}
	} else if valor := r.URL.Query().Get("pageSize"); valor != "" {
		if parsed, erro := strconv.Atoi(valor); erro == nil && parsed > 0 {
			limite = parsed
		}
	}

	if limite > limiteMaxAdmin {
		limite = limiteMaxAdmin
	}

	if valor := r.URL.Query().Get("offset"); valor != "" {
		if parsed, erro := strconv.Atoi(valor); erro == nil && parsed >= 0 {
			offset = parsed
			pagina = (offset / limite) + 1
			return pagina, limite, offset
		}
	}

	offset = (pagina - 1) * limite
	return pagina, limite, offset
}
