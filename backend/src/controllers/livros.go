package controllers

import (
	"backend/src/banco"
	"backend/src/modelos"
	"backend/src/repositorios"
	"backend/src/respostas"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
	"github.com/jackc/pgx/v5/pgconn"
)

// CriarLivro é a função responsável por criar um novo livro.
func CriarLivro(w http.ResponseWriter, r *http.Request) {
	corpoRequest, erro := io.ReadAll(r.Body)
	if erro != nil {
		respostas.Erro(w, http.StatusUnprocessableEntity, erro)
		return
	}

	var livro modelos.Livro
	if erro = json.Unmarshal(corpoRequest, &livro); erro != nil {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}

	if erro = livro.Preparar("criacao"); erro != nil {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}

	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	repositorio := repositorios.NovoRepositorioDeLivros(db)
	livro.ID, erro = repositorio.Criar(livro)
	if erro != nil {
		var pgErro *pgconn.PgError
		if errors.As(erro, &pgErro) {
			if pgErro.Code == "23505" {
				respostas.Erro(w, http.StatusConflict, erro)
				return
			}
		}
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	respostas.JSON(w, http.StatusCreated, livro)
}

// BuscarLivros é a função responsável por buscar todos os livros.
func BuscarLivros(w http.ResponseWriter, r *http.Request) {
	ISBN := r.URL.Query().Get("isbn")
	if ISBN == "" {
		respostas.Erro(w, http.StatusBadRequest, errors.New("ISBN é obrigatório"))
		return
	}

	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	repositorio := repositorios.NovoRepositorioDeLivros(db)
	livros, erro := repositorio.Buscar(ISBN)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	respostas.JSON(w, http.StatusOK, livros)
}

// BuscarLivroPorID é a função responsável por buscar um livro específico pelo seu ID.
func BuscarLivroPorID(w http.ResponseWriter, r *http.Request) {
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

	repositorio := repositorios.NovoRepositorioDeLivros(db)
	livro, erro := repositorio.BuscarPorID(ID)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	respostas.JSON(w, http.StatusOK, livro)
}

// AtualizarLivro é a função responsável por atualizar um livro específico pelo seu ID.
func AtualizarLivro(w http.ResponseWriter, r *http.Request) {
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

	var livro modelos.Livro
	if erro = json.Unmarshal(corpoRequest, &livro); erro != nil {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}

	if erro = livro.Preparar("atualizacao"); erro != nil {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}

	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	repositorio := repositorios.NovoRepositorioDeLivros(db)
	if erro = repositorio.Atualizar(ID, livro); erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	respostas.JSON(w, http.StatusNoContent, nil)
}

// InativarLivro é a função responsável por inativar um livro específico pelo seu ID.
func InativarLivro(w http.ResponseWriter, r *http.Request) {
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

	repositorio := repositorios.NovoRepositorioDeLivros(db)
	if erro = repositorio.Inativar(ID); erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	respostas.JSON(w, http.StatusNoContent, nil)
}

// BuscarLivrosPorAutor é a função responsável por buscar todos os livros de um autor específico.
func BuscarLivrosPorAutor(w http.ResponseWriter, r *http.Request) {
	autor := r.URL.Query().Get("autor")
	if autor == "" {
		respostas.Erro(w, http.StatusBadRequest, errors.New("autor é obrigatório"))
		return
	}

	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	repositorio := repositorios.NovoRepositorioDeLivros(db)
	livros, erro := repositorio.BuscarPorAutor(autor)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	respostas.JSON(w, http.StatusOK, livros)
}

// BuscarLivrosPorCategoria é a função responsável por buscar todos os livros de uma categoria específica.
func BuscarLivrosPorCategoria(w http.ResponseWriter, r *http.Request) {
	CategoriaID, erro := strconv.ParseUint(r.URL.Query().Get("categoriaId"), 10, 64)
	if erro != nil {
		respostas.Erro(w, http.StatusBadRequest, errors.New("categoriaId é obrigatório"))
		return
	}

	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	repositorio := repositorios.NovoRepositorioDeLivros(db)
	livros, erro := repositorio.BuscarPorCategoria(CategoriaID)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	respostas.JSON(w, http.StatusOK, livros)
}

// BuscarLivrosPorEditora é a função responsável por buscar todos os livros de uma editora específica.
func BuscarLivrosPorEditora(w http.ResponseWriter, r *http.Request) {
	Editora := r.URL.Query().Get("editora")
	if Editora == "" {
		respostas.Erro(w, http.StatusBadRequest, errors.New("editora é obrigatória"))
		return
	}

	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	repositorio := repositorios.NovoRepositorioDeLivros(db)
	livros, erro := repositorio.BuscarPorEditora(Editora)

	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	respostas.JSON(w, http.StatusOK, livros)
}

// BuscarLivrosPorISBN é a função responsável por buscar um livro específico pelo seu ISBN.
func BuscarLivrosPorISBN(w http.ResponseWriter, r *http.Request) {
	ISBN := r.URL.Query().Get("isbn")
	if ISBN == "" {
		respostas.Erro(w, http.StatusBadRequest, errors.New("ISBN é obrigatório"))
		return
	}

	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	repositorio := repositorios.NovoRepositorioDeLivros(db)
	livro, erro := repositorio.BuscarPorISBN(ISBN)

	respostas.JSON(w, http.StatusOK, livro)
}

// BuscarLivrosPorTitulo é a função responsável por buscar um livro específico pelo seu título.
func BuscarLivrosPorTitulo(w http.ResponseWriter, r *http.Request) {
	titulo := r.URL.Query().Get("titulo")
	if titulo == "" {
		respostas.Erro(w, http.StatusBadRequest, errors.New("título é obrigatório"))
		return
	}

	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	repositorio := repositorios.NovoRepositorioDeLivros(db)
	livro, erro := repositorio.BuscarPorTitulo(titulo)

	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	respostas.JSON(w, http.StatusOK, livro)
}