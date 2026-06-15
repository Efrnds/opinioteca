package controllers

import (
	"backend/src/banco"
	"backend/src/modelos"
	"backend/src/repositorios"
	"backend/src/respostas"
	"backend/src/servicos"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
	"github.com/jackc/pgx/v5/pgconn"
)

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

	livro.Origem = "manual"
	if erro = livro.Preparar("admin"); erro != nil {
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
		if errors.As(erro, &pgErro) && pgErro.Code == "23505" {
			respostas.Erro(w, http.StatusConflict, erro)
			return
		}
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	respostas.JSON(w, http.StatusCreated, livro)
}

func BuscarLivrosUnificado(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query().Get("q")
	if q == "" {
		respostas.Erro(w, http.StatusBadRequest, errors.New("Parâmetro q é obrigatório"))
		return
	}

	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	servico := servicos.NovoServicoLivros(db)
	livros, erro := servico.BuscarUnificado(q)
	if erro != nil {
		respostas.Erro(w, http.StatusServiceUnavailable, erro)
		return
	}
	respostas.JSON(w, http.StatusOK, livros)
}

func AdminListarLivros(w http.ResponseWriter, r *http.Request) {
	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	filtros := repositorios.FiltrosLivros{
		Query:  r.URL.Query().Get("q"),
		Status: r.URL.Query().Get("status"),
		Origem: r.URL.Query().Get("origem"),
		Limite: 100,
	}

	repositorio := repositorios.NovoRepositorioDeLivros(db)
	livros, erro := repositorio.BuscarTodos(filtros)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	respostas.JSON(w, http.StatusOK, livros)
}

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
		respostas.Erro(w, http.StatusNotFound, errors.New("Livro não encontrado"))
		return
	}
	respostas.JSON(w, http.StatusOK, livro.ParaPublico())
}

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

	if erro = livro.Preparar("admin"); erro != nil {
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
	respostas.NoContent(w)
}

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
	respostas.NoContent(w)
}

func BuscarAvaliacoesPorLivro(w http.ResponseWriter, r *http.Request) {
	parametros := mux.Vars(r)
	livroID, erro := strconv.ParseUint(parametros["livroId"], 10, 64)
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

	repoLivros := repositorios.NovoRepositorioDeLivros(db)
	if _, erro = repoLivros.BuscarPorID(livroID); erro != nil {
		respostas.Erro(w, http.StatusNotFound, errors.New("Livro não encontrado"))
		return
	}

	repoAvaliacoes := repositorios.NovoRepositorioDeAvaliacoes(db)
	avaliacoes, erro := repoAvaliacoes.BuscarPorLivro(livroID)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	respostas.JSON(w, http.StatusOK, avaliacoes)
}
