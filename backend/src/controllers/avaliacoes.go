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
	"encoding/base64"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gorilla/mux"
	"github.com/jackc/pgx/v5/pgconn"
)

// feedCursorPayload é o JSON opaco embutido em next_cursor (base64url).
// Formato: {"criadoEm":"<RFC3339Nano>","id":<uint64>}
type feedCursorPayload struct {
	CriadoEm string `json:"criadoEm"`
	ID       uint64 `json:"id"`
}

func encodeFeedCursor(criadoEm time.Time, id uint64) (string, error) {
	payload, erro := json.Marshal(feedCursorPayload{
		CriadoEm: criadoEm.UTC().Format(time.RFC3339Nano),
		ID:       id,
	})
	if erro != nil {
		return "", erro
	}
	return base64.RawURLEncoding.EncodeToString(payload), nil
}

func decodeFeedCursor(cursor string) (time.Time, uint64, error) {
	dados, erro := base64.RawURLEncoding.DecodeString(cursor)
	if erro != nil {
		dados, erro = base64.URLEncoding.DecodeString(cursor)
		if erro != nil {
			return time.Time{}, 0, errors.New("cursor inválido")
		}
	}

	var payload feedCursorPayload
	if erro = json.Unmarshal(dados, &payload); erro != nil {
		return time.Time{}, 0, errors.New("cursor inválido")
	}
	if payload.ID == 0 || payload.CriadoEm == "" {
		return time.Time{}, 0, errors.New("cursor inválido")
	}

	criadoEm, erro := time.Parse(time.RFC3339Nano, payload.CriadoEm)
	if erro != nil {
		criadoEm, erro = time.Parse(time.RFC3339, payload.CriadoEm)
		if erro != nil {
			return time.Time{}, 0, errors.New("cursor inválido")
		}
	}

	return criadoEm, payload.ID, nil
}

func limiteFeed(r *http.Request) int {
	limite := 20
	valor := r.URL.Query().Get("limite")
	if valor == "" {
		valor = r.URL.Query().Get("limit")
	}
	if valor == "" {
		return limite
	}
	parsed, erro := strconv.Atoi(valor)
	if erro != nil || parsed <= 0 {
		return limite
	}
	if parsed > 50 {
		return 50
	}
	return parsed
}

func BuscarFeed(w http.ResponseWriter, r *http.Request) {
	limite := limiteFeed(r)

	var cursorCriadoEm *time.Time
	var cursorID *uint64
	if valor := strings.TrimSpace(r.URL.Query().Get("cursor")); valor != "" {
		criadoEm, id, erro := decodeFeedCursor(valor)
		if erro != nil {
			respostas.Erro(w, http.StatusBadRequest, erro)
			return
		}
		cursorCriadoEm = &criadoEm
		cursorID = &id
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
	var viewerID uint64
	if usuarioID != nil {
		viewerID = *usuarioID
	}
	// Busca limite+1 para saber se há próxima página sem OFFSET.
	if tipo == "seguindo" && usuarioID != nil {
		feed, erro = repoAvaliacoes.BuscarFeedSeguindo(*usuarioID, limite+1, cursorCriadoEm, cursorID)
	} else {
		feed, erro = repoAvaliacoes.BuscarFeed(viewerID, limite+1, cursorCriadoEm, cursorID)
	}
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	var nextCursor *string
	if len(feed) > limite {
		ultimo := feed[limite-1]
		encoded, erroCursor := encodeFeedCursor(ultimo.CriadoEm, ultimo.ID)
		if erroCursor != nil {
			respostas.Erro(w, http.StatusInternalServerError, erroCursor)
			return
		}
		nextCursor = &encoded
		feed = feed[:limite]
	}

	itens, erro := montarFeedComVotos(db, feed, usuarioID)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	respostas.JSON(w, http.StatusOK, modelos.FeedPaginaResposta{
		Itens:      itens,
		NextCursor: nextCursor,
	})
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

	repoUsuarios := repositorios.NovoRepositorioDeUsuarios(db)
	usuario, erro := repoUsuarios.BuscarPorID(usuarioID)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	if req.TemplateID != nil && *req.TemplateID > 0 {
		template, erroTpl := repositorios.NovoRepositorioDeTemplates(db).BuscarPorID(*req.TemplateID)
		if erroTpl == sql.ErrNoRows || !template.Ativo {
			respostas.Erro(w, http.StatusBadRequest, errors.New("Template inválido ou inativo"))
			return
		}
		if erroTpl != nil {
			respostas.Erro(w, http.StatusInternalServerError, erroTpl)
			return
		}
		if modelos.PlanoEfetivoID(usuario) < template.AssinaturaMinimaID {
			respostas.Erro(w, http.StatusForbidden, errors.New("Seu plano não permite este template de avaliação"))
			return
		}
	}

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

	viewerID := auth.ExtrairUsuarioIDOpcional(r)
	podeVer, erro := repositorios.PodeVerConteudoDoPerfil(db, viewerID, feed.Usuario.ID)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	if !podeVer {
		respostas.Erro(w, http.StatusForbidden, errors.New("Este perfil é privado"))
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
	if erro != nil || usuario.ID == 0 {
		respostas.Erro(w, http.StatusNotFound, errors.New("Usuário não encontrado"))
		return
	}

	viewerID := auth.ExtrairUsuarioIDOpcional(r)
	ehDono := viewerID != 0 && viewerID == usuario.ID

	if usuario.Status != "ativo" && !ehDono {
		respostas.JSON(w, http.StatusOK, []any{})
		return
	}

	config, _ := repositorios.NovoRepositorioDeConfiguracoes(db).BuscarOuCriar(usuario.ID)
	segue, _ := repoUsuarios.Segue(viewerID, usuario.ID)
	if config.VisibilidadePerfil == modelos.VisibilidadePrivado && !ehDono && !segue {
		respostas.Erro(w, http.StatusForbidden, errors.New("Este perfil é privado"))
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

	repoUsuarios := repositorios.NovoRepositorioDeUsuarios(db)
	usuario, erro := repoUsuarios.BuscarPorID(usuarioID)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	if !modelos.TemPlanoTop(usuario) {
		respostas.Erro(w, http.StatusForbidden, errors.New("Edição de avaliações disponível no OpinioTop"))
		return
	}

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
