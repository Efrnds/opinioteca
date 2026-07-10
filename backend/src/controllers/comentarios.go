package controllers

import (
	"backend/src/auth"
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

	"github.com/gorilla/mux"
)

func stringPtrOuNil(valor string) *string {
	if valor == "" {
		return nil
	}
	return &valor
}

func BuscarComentariosAvaliacao(w http.ResponseWriter, r *http.Request) {
	avaliacaoID, erro := avaliacaoIDDaURL(r)
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
	avaliacao, erro := repoAvaliacoes.BuscarPorID(avaliacaoID)
	if erro == sql.ErrNoRows {
		respostas.Erro(w, http.StatusNotFound, errors.New("Avaliação não encontrada"))
		return
	}
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	viewerID := auth.ExtrairUsuarioIDOpcional(r)
	podeVer, erro := repositorios.PodeVerConteudoDoPerfil(db, viewerID, avaliacao.UsuarioID)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	if !podeVer {
		respostas.Erro(w, http.StatusForbidden, errors.New("Este perfil é privado"))
		return
	}

	usuarioID := usuarioIDDoTokenOpcional(r)
	repoComentarios := repositorios.NovoRepositorioDeComentarios(db)
	comentarios, erro := repoComentarios.BuscarPorAvaliacao(avaliacaoID, usuarioID)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	respostas.JSON(w, http.StatusOK, comentarios)
}

func CriarComentarioAvaliacao(w http.ResponseWriter, r *http.Request) {
	avaliacaoID, erro := avaliacaoIDDaURL(r)
	if erro != nil {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}

	usuarioID, erro := auth.ExtrairUsuarioID(r)
	if erro != nil {
		respostas.Erro(w, http.StatusUnauthorized, erro)
		return
	}

	corpoRequest, erro := io.ReadAll(r.Body)
	if erro != nil {
		respostas.Erro(w, http.StatusUnprocessableEntity, erro)
		return
	}

	var req modelos.CriarComentarioRequest
	if erro = json.Unmarshal(corpoRequest, &req); erro != nil {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}
	if erro = req.Preparar(); erro != nil {
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
	avaliacao, erro := repoAvaliacoes.BuscarPorID(avaliacaoID)
	if erro == sql.ErrNoRows {
		respostas.Erro(w, http.StatusNotFound, errors.New("Avaliação não encontrada"))
		return
	}
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	podeVer, erro := repositorios.PodeVerConteudoDoPerfil(db, usuarioID, avaliacao.UsuarioID)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	if !podeVer {
		respostas.Erro(w, http.StatusForbidden, errors.New("Este perfil é privado"))
		return
	}

	repoComentarios := repositorios.NovoRepositorioDeComentarios(db)
	if req.PaiID != nil {
		comentarioPai, erro := repoComentarios.BuscarPorID(*req.PaiID)
		if erro == sql.ErrNoRows {
			respostas.Erro(w, http.StatusNotFound, errors.New("Comentário pai não encontrado"))
			return
		}
		if erro != nil {
			respostas.Erro(w, http.StatusInternalServerError, erro)
			return
		}
		if comentarioPai.AvaliacaoID != avaliacaoID {
			respostas.Erro(w, http.StatusBadRequest, errors.New("Comentário pai inválido para esta avaliação"))
			return
		}
	}

	comentario, erro := repoComentarios.Criar(modelos.Comentario{
		UsuarioID:   usuarioID,
		AvaliacaoID: avaliacaoID,
		PaiID:       req.PaiID,
		Texto:       req.Texto,
		AnexoURL:    stringPtrOuNil(req.AnexoURL),
	})
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	if erro = repoComentarios.AtualizarComentarioDestaqueCache(avaliacaoID); erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	usuario, erro := repositorios.NovoRepositorioDeUsuarios(db).BuscarPorID(usuarioID)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	ref := avaliacaoID
	servicos.DispararNotificacao(db, avaliacao.UsuarioID, usuarioID, "comentario", usuario.Nome+" comentou na sua avaliação", comentario.Texto, &ref)

	respostaComentario := modelos.ComentarioResposta{
		ID:          comentario.ID,
		PaiID:       comentario.PaiID,
		Texto:       comentario.Texto,
		AnexoURL:    comentario.AnexoURL,
		CriadoEm:    comentario.CriadoEm,
		Votos:       0,
		VotoUsuario: "",
		Usuario: modelos.UsuarioFeed{
			ID:    usuario.ID,
			Nome:  usuario.Nome,
			Nick:  usuario.Nick,
			Image: usuario.Image,
		},
	}
	servicos.BroadcastNovoComentario(db, avaliacaoID, respostaComentario)

	respostas.JSON(w, http.StatusCreated, respostaComentario)
}

func VotarComentario(w http.ResponseWriter, r *http.Request) {
	comentarioID, erro := strconv.ParseUint(mux.Vars(r)["id"], 10, 64)
	if erro != nil {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}

	usuarioID, erro := auth.ExtrairUsuarioID(r)
	if erro != nil {
		respostas.Erro(w, http.StatusUnauthorized, erro)
		return
	}

	corpoRequest, erro := io.ReadAll(r.Body)
	if erro != nil {
		respostas.Erro(w, http.StatusUnprocessableEntity, erro)
		return
	}

	var req modelos.VotoRequest
	if erro = json.Unmarshal(corpoRequest, &req); erro != nil {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}
	if erro = req.Preparar(); erro != nil {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}

	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	repoComentarios := repositorios.NovoRepositorioDeComentarios(db)
	comentario, erro := repoComentarios.BuscarPorID(comentarioID)
	if erro == sql.ErrNoRows {
		respostas.Erro(w, http.StatusNotFound, errors.New("Comentário não encontrado"))
		return
	}
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	if comentario.UsuarioID == usuarioID {
		respostas.Erro(w, http.StatusForbidden, errors.New("Você não pode votar no seu próprio comentário"))
		return
	}

	avaliacao, erro := repositorios.NovoRepositorioDeAvaliacoes(db).BuscarPorID(comentario.AvaliacaoID)
	if erro != nil {
		respostas.Erro(w, http.StatusNotFound, errors.New("Avaliação não encontrada"))
		return
	}
	podeVer, erro := repositorios.PodeVerConteudoDoPerfil(db, usuarioID, avaliacao.UsuarioID)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	if !podeVer {
		respostas.Erro(w, http.StatusForbidden, errors.New("Conteúdo indisponível"))
		return
	}

	if erro = repoComentarios.VotarComentario(usuarioID, comentarioID, req.TipoVoto); erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	if erro = repoComentarios.AtualizarComentarioDestaqueCache(comentario.AvaliacaoID); erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	comentarios, erro := repoComentarios.BuscarPorAvaliacao(comentario.AvaliacaoID, &usuarioID)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	for _, item := range comentarios {
		if item.ID == comentarioID {
			servicos.BroadcastComentarioAtualizado(db, comentario.AvaliacaoID, item)
			respostas.JSON(w, http.StatusOK, item)
			return
		}
	}

	respostas.Erro(w, http.StatusNotFound, errors.New("Comentário não encontrado"))
}

func RemoverVotoComentario(w http.ResponseWriter, r *http.Request) {
	comentarioID, erro := strconv.ParseUint(mux.Vars(r)["id"], 10, 64)
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

	repoComentarios := repositorios.NovoRepositorioDeComentarios(db)
	comentario, erro := repoComentarios.BuscarPorID(comentarioID)
	if erro == sql.ErrNoRows {
		respostas.Erro(w, http.StatusNotFound, errors.New("Comentário não encontrado"))
		return
	}
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	if erro = repoComentarios.RemoverVotoComentario(usuarioID, comentarioID); erro != nil {
		if errors.Is(erro, sql.ErrNoRows) {
			respostas.Erro(w, http.StatusNotFound, errors.New("Voto não encontrado"))
			return
		}
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	if erro = repoComentarios.AtualizarComentarioDestaqueCache(comentario.AvaliacaoID); erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	comentarios, erro := repoComentarios.BuscarPorAvaliacao(comentario.AvaliacaoID, &usuarioID)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	for _, item := range comentarios {
		if item.ID == comentarioID {
			servicos.BroadcastComentarioAtualizado(db, comentario.AvaliacaoID, item)
			respostas.JSON(w, http.StatusOK, item)
			return
		}
	}

	respostas.Erro(w, http.StatusNotFound, errors.New("Comentário não encontrado"))
}
