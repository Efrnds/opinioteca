package controllers

import (
	"backend/src/banco"
	"backend/src/modelos"
	"backend/src/repositorios"
	"backend/src/respostas"
	"backend/src/servicos"
	"database/sql"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"
	"strings"

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
	if erro = repositorio.SubstituirCategorias(livro.ID, livro.CategoriasResolvidas()); erro != nil {
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
	resultado, erro := servico.BuscarUnificado(q)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	respostas.JSON(w, http.StatusOK, resultado)
}

func CriarLivroUsuario(w http.ResponseWriter, r *http.Request) {
	corpoRequest, erro := io.ReadAll(r.Body)
	if erro != nil {
		respostas.Erro(w, http.StatusUnprocessableEntity, erro)
		return
	}

	var req modelos.CriarLivroUsuarioRequest
	if erro = json.Unmarshal(corpoRequest, &req); erro != nil {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}

	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	servico := servicos.NovoServicoLivros(db)
	livro, erro := servico.RegistrarLivroUsuario(req)
	if erro != nil {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}
	respostas.JSON(w, http.StatusCreated, livro.ParaBusca())
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
	if erro = repositorio.PreencherCategorias(livros); erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	respostas.JSON(w, http.StatusOK, livros)
}

func BuscarLivroPorGoogleVolume(w http.ResponseWriter, r *http.Request) {
	parametros := mux.Vars(r)
	volumeID := strings.TrimSpace(parametros["volumeId"])
	if volumeID == "" {
		respostas.Erro(w, http.StatusBadRequest, errors.New("Volume inválido"))
		return
	}

	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	servico := servicos.NovoServicoLivros(db)
	livro, erro := servico.BuscarPorGoogleVolume(volumeID)
	if erro != nil {
		status := http.StatusInternalServerError
		if strings.Contains(strings.ToLower(erro.Error()), "não encontrado") {
			status = http.StatusNotFound
		}
		respostas.Erro(w, status, erro)
		return
	}
	respostas.JSON(w, http.StatusOK, livro)
}

func BuscarLivroPorID(w http.ResponseWriter, r *http.Request) {
	parametros := mux.Vars(r)
	identificador := strings.TrimSpace(parametros["id"])
	if identificador == "" {
		respostas.Erro(w, http.StatusBadRequest, errors.New("Identificador inválido"))
		return
	}

	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	if idNumerico, erro := strconv.ParseUint(identificador, 10, 64); erro == nil {
		repositorio := repositorios.NovoRepositorioDeLivros(db)
		livro, erro := repositorio.BuscarPorID(idNumerico)
		if erro != nil {
			respostas.Erro(w, http.StatusNotFound, errors.New("Livro não encontrado"))
			return
		}
		respostas.JSON(w, http.StatusOK, livro.ParaPublico())
		return
	}

	servico := servicos.NovoServicoLivros(db)
	livro, erro := servico.BuscarPorGoogleVolume(identificador)
	if erro != nil {
		status := http.StatusInternalServerError
		if strings.Contains(strings.ToLower(erro.Error()), "não encontrado") {
			status = http.StatusNotFound
		}
		respostas.Erro(w, status, erro)
		return
	}
	respostas.JSON(w, http.StatusOK, livro)
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
	if erro = repositorio.SubstituirCategorias(ID, livro.CategoriasResolvidas()); erro != nil {
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
	identificador := strings.TrimSpace(parametros["livroId"])
	if identificador == "" {
		respostas.Erro(w, http.StatusBadRequest, errors.New("Identificador inválido"))
		return
	}

	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	servicoLivros := servicos.NovoServicoLivros(db)
	livroID, erro := servicoLivros.ResolverLivroIDBanco(identificador)
	if erro != nil {
		if erro == sql.ErrNoRows {
			respostas.JSON(w, http.StatusOK, []any{})
			return
		}
		if strings.Contains(strings.ToLower(erro.Error()), "não encontrado") {
			respostas.Erro(w, http.StatusNotFound, errors.New("Livro não encontrado"))
			return
		}
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	repoAvaliacoes := repositorios.NovoRepositorioDeAvaliacoes(db)
	feed, erro := repoAvaliacoes.BuscarFeedPorLivro(livroID)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	usuarioID := usuarioIDDoTokenOpcional(r)
	resposta, erro := montarFeedComVotos(db, feed, usuarioID)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	respostas.JSON(w, http.StatusOK, resposta)
}
