package controllers

import (
	"backend/src/auth"
	"backend/src/banco"
	"backend/src/integracoes/googlebooks"
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

func BuscarFeed(w http.ResponseWriter, r *http.Request) {
	limite := 20
	offset := 0

	if valor := r.URL.Query().Get("limite"); valor != "" {
		if parsed, erro := strconv.Atoi(valor); erro == nil && parsed > 0 && parsed <= 50 {
			limite = parsed
		}
	}
	if valor := r.URL.Query().Get("offset"); valor != "" {
		if parsed, erro := strconv.Atoi(valor); erro == nil && parsed >= 0 {
			offset = parsed
		}
	}

	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	repoAvaliacoes := repositorios.NovoRepositorioDeAvaliacoes(db)
	usuarioID := usuarioIDDoTokenOpcional(r)

	tipo := strings.ToLower(r.URL.Query().Get("tipo"))
	var feed []modelos.AvaliacaoFeed
	if tipo == "seguindo" && usuarioID != nil {
		feed, erro = repoAvaliacoes.BuscarFeedSeguindo(*usuarioID, limite, offset)
	} else {
		feed, erro = repoAvaliacoes.BuscarFeed(limite, offset)
	}
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	resposta, erro := montarFeedComVotos(db, feed, usuarioID)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	respostas.JSON(w, http.StatusOK, resposta)
}

func CriarAvaliacao(w http.ResponseWriter, r *http.Request) {
	corpoRequest, erro := io.ReadAll(r.Body)
	if erro != nil {
		respostas.Erro(w, http.StatusUnprocessableEntity, erro)
		return
	}

	var req modelos.CriarAvaliacaoRequest
	if erro = json.Unmarshal(corpoRequest, &req); erro != nil {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}
	if erro = req.Preparar(); erro != nil {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}

	usuarioID, erro := auth.ExtrairUsuarioID(r)
	if erro != nil {
		respostas.Erro(w, http.StatusUnauthorized, erro)
		return
	}

	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	servicoLivros := servicos.NovoServicoLivros(db)
	livroID, erro := servicoLivros.ResolverLivro(req.LivroID, req.GoogleVolumeID)
	if erro != nil {
		if errors.Is(erro, googlebooks.ErrDadosInsuficientes) {
			respostas.Erro(w, http.StatusUnprocessableEntity, erro)
			return
		}
		if strings.Contains(erro.Error(), "Google Books") || strings.Contains(erro.Error(), "GOOGLE_BOOKS_API_KEY") {
			respostas.Erro(w, http.StatusServiceUnavailable, erro)
			return
		}
		respostas.Erro(w, http.StatusUnprocessableEntity, erro)
		return
	}

	tx, erro := db.Begin()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer tx.Rollback()

	avaliacao := modelos.Avaliacao{
		UsuarioID:     usuarioID,
		LivroID:       livroID,
		TemplateID:    req.TemplateID,
		Nota:          req.Nota,
		Texto:         req.Texto,
		ContemSpoiler: req.ContemSpoiler,
		AnexoURL:      stringPtrOuNil(req.AnexoURL),
	}

	repoAvaliacoes := repositorios.NovoRepositorioDeAvaliacoes(db)
	avaliacao.ID, erro = repoAvaliacoes.Criar(tx, avaliacao)
	if erro != nil {
		var pgErro *pgconn.PgError
		if errors.As(erro, &pgErro) && pgErro.Code == "23505" {
			respostas.Erro(w, http.StatusConflict, errors.New("Você já avaliou este livro"))
			return
		}
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	if erro = tx.Commit(); erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	avaliacao, _ = repoAvaliacoes.BuscarPorID(avaliacao.ID)
	respostas.JSON(w, http.StatusCreated, modelos.CriarAvaliacaoResposta{
		Avaliacao: avaliacao,
		LivroID:   livroID,
	})
}

func BuscarAvaliacaoPorID(w http.ResponseWriter, r *http.Request) {
	parametros := mux.Vars(r)
	id, erro := strconv.ParseUint(parametros["id"], 10, 64)
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

	repoAvaliacoes := repositorios.NovoRepositorioDeAvaliacoes(db)
	feed, erro := repoAvaliacoes.BuscarFeedPorID(id)
	if erro == sql.ErrNoRows {
		respostas.Erro(w, http.StatusNotFound, errors.New("Avaliação não encontrada"))
		return
	}
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	usuarioID := usuarioIDDoTokenOpcional(r)
	resposta, erro := montarFeedComVotos(db, []modelos.AvaliacaoFeed{feed}, usuarioID)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	respostas.JSON(w, http.StatusOK, resposta[0])
}

func BuscarAvaliacoesPorUsuario(w http.ResponseWriter, r *http.Request) {
	nick := nickDaURL(r)

	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	repoUsuarios := repositorios.NovoRepositorioDeUsuarios(db)
	usuario, erro := repoUsuarios.BuscarPorNick(nick)
	if erro != nil {
		respostas.Erro(w, http.StatusNotFound, errors.New("Usuário não encontrado"))
		return
	}

	repoAvaliacoes := repositorios.NovoRepositorioDeAvaliacoes(db)
	avaliacoes, erro := repoAvaliacoes.BuscarPorUsuario(usuario.ID)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	usuarioID := usuarioIDDoTokenOpcional(r)
	resposta, erro := montarAvaliacoesComVotos(db, avaliacoes, usuarioID)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	respostas.JSON(w, http.StatusOK, resposta)
}

func AtualizarAvaliacao(w http.ResponseWriter, r *http.Request) {
	parametros := mux.Vars(r)
	id, erro := strconv.ParseUint(parametros["id"], 10, 64)
	if erro != nil {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}

	corpoRequest, erro := io.ReadAll(r.Body)
	if erro != nil {
		respostas.Erro(w, http.StatusUnprocessableEntity, erro)
		return
	}

	var req modelos.AtualizarAvaliacaoRequest
	if erro = json.Unmarshal(corpoRequest, &req); erro != nil {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}
	if erro = req.Preparar(); erro != nil {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}

	usuarioID, erro := auth.ExtrairUsuarioID(r)
	if erro != nil {
		respostas.Erro(w, http.StatusUnauthorized, erro)
		return
	}

	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	repoAvaliacoes := repositorios.NovoRepositorioDeAvaliacoes(db)
	if erro = repoAvaliacoes.Atualizar(id, usuarioID, req.Nota, req.Texto); erro == sql.ErrNoRows {
		repoAvaliacoesCheck := repositorios.NovoRepositorioDeAvaliacoes(db)
		if _, errCheck := repoAvaliacoesCheck.BuscarPorID(id); errCheck == sql.ErrNoRows {
			respostas.Erro(w, http.StatusNotFound, errors.New("Avaliação não encontrada"))
			return
		}
		respostas.Erro(w, http.StatusForbidden, errors.New("Você só pode editar suas próprias avaliações"))
		return
	}
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	respostas.NoContent(w)
}

func DeletarAvaliacao(w http.ResponseWriter, r *http.Request) {
	parametros := mux.Vars(r)
	id, erro := strconv.ParseUint(parametros["id"], 10, 64)
	if erro != nil {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}

	usuarioID, erro := auth.ExtrairUsuarioID(r)
	if erro != nil {
		respostas.Erro(w, http.StatusUnauthorized, erro)
		return
	}

	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	repoAvaliacoes := repositorios.NovoRepositorioDeAvaliacoes(db)
	if erro = repoAvaliacoes.Deletar(id, usuarioID); erro == sql.ErrNoRows {
		if _, errCheck := repoAvaliacoes.BuscarPorID(id); errCheck == sql.ErrNoRows {
			respostas.Erro(w, http.StatusNotFound, errors.New("Avaliação não encontrada"))
			return
		}
		respostas.Erro(w, http.StatusForbidden, errors.New("Você só pode remover suas próprias avaliações"))
		return
	}
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	respostas.NoContent(w)
}
