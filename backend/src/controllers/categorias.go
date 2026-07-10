package controllers

import (
	"backend/src/banco"
	"backend/src/modelos"
	"backend/src/repositorios"
	"backend/src/respostas"
	"encoding/json"
	"io"
	"net/http"
	"strconv"
	"github.com/gorilla/mux"
)

// CriarCategoria é a função responsável por criar uma nova categoria.
func CriarCategoria(w http.ResponseWriter, r *http.Request) {
	corpoRequest, erro := io.ReadAll(r.Body)
	if erro != nil {
		respostas.Erro(w, http.StatusUnprocessableEntity, erro)
		return
	}

	var categoria modelos.Categoria
	if erro = json.Unmarshal(corpoRequest, &categoria); erro != nil {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}

	if erro = categoria.Preparar("criacao"); erro != nil {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}

	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	repositorio := repositorios.NovoRepositorioDeCategorias(db)
	categoria.ID, erro = repositorio.Criar(categoria)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	respostas.JSON(w, http.StatusCreated, categoria)
}

// BuscarCategorias lista categorias ativas.
// Sem parâmetros de paginação, retorna o array completo (compatível com /categorias público).
// Com pagina/limite, retorna envelope { itens, total, pagina, limite }.
func BuscarCategorias(w http.ResponseWriter, r *http.Request) {
	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	repositorio := repositorios.NovoRepositorioDeCategorias(db)
	query := r.URL.Query()
	paginar := query.Get("pagina") != "" || query.Get("limite") != "" ||
		query.Get("page") != "" || query.Get("pageSize") != "" || query.Get("offset") != ""

	if !paginar {
		categorias, erro := repositorio.Buscar()
		if erro != nil {
			respostas.Erro(w, http.StatusInternalServerError, erro)
			return
		}
		if categorias == nil {
			categorias = []modelos.Categoria{}
		}
		respostas.JSON(w, http.StatusOK, categorias)
		return
	}

	pagina, limite, offset := paginacaoAdmin(r)
	categorias, total, erro := repositorio.BuscarPaginado(limite, offset)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	if categorias == nil {
		categorias = []modelos.Categoria{}
	}
	respostas.JSON(w, http.StatusOK, modelos.RespostaPaginada{
		Itens:  categorias,
		Total:  total,
		Pagina: pagina,
		Limite: limite,
	})
}

// BuscarCategoriaPorID é a função responsável por buscar uma categoria específica pelo seu ID.
func BuscarCategoriaPorID(w http.ResponseWriter, r *http.Request) {
	parametros := mux.Vars(r)

	ID, erro := strconv.ParseUint(parametros["id"], 10, 64)
	if erro != nil {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}

	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	repositorio := repositorios.NovoRepositorioDeCategorias(db)
	categoria, erro := repositorio.BuscarPorID(ID)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	respostas.JSON(w, http.StatusOK, categoria)
}

// AtualizarCategoria é a função responsável por atualizar uma categoria específica pelo seu ID.
func AtualizarCategoria(w http.ResponseWriter, r *http.Request) {
	parametros := mux.Vars(r)

	ID, erro := strconv.ParseUint(parametros["id"], 10, 64)
	if erro != nil {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}

	corpoRequest, erro := io.ReadAll(r.Body)
	if erro != nil {
		respostas.Erro(w, http.StatusUnprocessableEntity, erro)
		return
	}

	var categoria modelos.Categoria
	if erro = json.Unmarshal(corpoRequest, &categoria); erro != nil {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}

	if erro = categoria.Preparar("atualizacao"); erro != nil {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}

	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	repositorio := repositorios.NovoRepositorioDeCategorias(db)
	if erro = repositorio.Atualizar(ID, categoria); erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	respostas.JSON(w, http.StatusNoContent, nil)
}

// InativarCategoria é a função responsável por inativar uma categoria específica pelo seu ID.
func InativarCategoria(w http.ResponseWriter, r *http.Request) {
	parametros := mux.Vars(r)

	ID, erro := strconv.ParseUint(parametros["id"], 10, 64)
	if erro != nil {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}

	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	repositorio := repositorios.NovoRepositorioDeCategorias(db)
	if erro = repositorio.Inativar(ID); erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	respostas.JSON(w, http.StatusNoContent, nil)
}