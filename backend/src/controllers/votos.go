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
	"strings"

	"github.com/gorilla/mux"
)

func avaliacaoIDDaURL(r *http.Request) (uint64, error) {
	return strconv.ParseUint(mux.Vars(r)["id"], 10, 64)
}

func montarAvaliacaoComVotos(db *sql.DB, avaliacao modelos.Avaliacao, usuarioID *uint64) (modelos.AvaliacaoComVotos, error) {
	repoVotos := repositorios.NovoRepositorioDeVotos(db)
	contadores, erro := repoVotos.ContarPorAvaliacao(avaliacao.ID)
	if erro != nil {
		return modelos.AvaliacaoComVotos{}, erro
	}

	resposta := modelos.AvaliacaoComVotos{
		Avaliacao: avaliacao,
		Votos:     contadores,
	}

	if usuarioID != nil {
		voto, erro := repoVotos.BuscarPorUsuarioEAvaliacao(*usuarioID, avaliacao.ID)
		if erro == nil {
			resposta.MeuVoto = voto.TipoVoto
		}
	}

	return resposta, nil
}

func montarAvaliacoesComVotos(db *sql.DB, avaliacoes []modelos.Avaliacao, usuarioID *uint64) ([]modelos.AvaliacaoComVotos, error) {
	if len(avaliacoes) == 0 {
		return []modelos.AvaliacaoComVotos{}, nil
	}

	ids := make([]uint64, len(avaliacoes))
	for i, avaliacao := range avaliacoes {
		ids[i] = avaliacao.ID
	}

	repoVotos := repositorios.NovoRepositorioDeVotos(db)
	contadores, erro := repoVotos.ContarPorAvaliacoes(ids)
	if erro != nil {
		return nil, erro
	}

	meusVotos := map[uint64]string{}
	if usuarioID != nil {
		meusVotos, erro = repoVotos.MeusVotosPorAvaliacoes(*usuarioID, ids)
		if erro != nil {
			return nil, erro
		}
	}

	resultado := make([]modelos.AvaliacaoComVotos, len(avaliacoes))
	for i, avaliacao := range avaliacoes {
		votos := contadores[avaliacao.ID]
		resultado[i] = modelos.AvaliacaoComVotos{
			Avaliacao: avaliacao,
			Votos:     votos,
			MeuVoto:   meusVotos[avaliacao.ID],
		}
	}
	return resultado, nil
}

func montarFeedComVotos(db *sql.DB, feed []modelos.AvaliacaoFeed, usuarioID *uint64) ([]modelos.AvaliacaoFeed, error) {
	if len(feed) == 0 {
		return []modelos.AvaliacaoFeed{}, nil
	}

	ids := make([]uint64, len(feed))
	for i, item := range feed {
		ids[i] = item.ID
	}

	repoVotos := repositorios.NovoRepositorioDeVotos(db)
	contadores, erro := repoVotos.ContarPorAvaliacoes(ids)
	if erro != nil {
		return nil, erro
	}

	meusVotos := map[uint64]string{}
	if usuarioID != nil {
		meusVotos, erro = repoVotos.MeusVotosPorAvaliacoes(*usuarioID, ids)
		if erro != nil {
			return nil, erro
		}
	}

	for i := range feed {
		feed[i].Votos = contadores[feed[i].ID]
		feed[i].MeuVoto = meusVotos[feed[i].ID]
	}

	return feed, nil
}

func usuarioIDDoTokenOpcional(r *http.Request) *uint64 {
	usuarioID, erro := auth.ExtrairUsuarioID(r)
	if erro != nil {
		return nil
	}
	return &usuarioID
}

func VotarAvaliacao(w http.ResponseWriter, r *http.Request) {
	avaliacaoID, erro := avaliacaoIDDaURL(r)
	if erro != nil {
		respostas.Erro(w, http.StatusBadRequest, erro)
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

	votanteID, erro := auth.ExtrairUsuarioID(r)
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

	servico := servicos.NovoServicoVotos(db)
	voto, erro := servico.Votar(votanteID, avaliacaoID, req.TipoVoto)
	if erro != nil {
		switch {
		case strings.Contains(erro.Error(), "não encontrada"):
			respostas.Erro(w, http.StatusNotFound, erro)
		case strings.Contains(erro.Error(), "própria"):
			respostas.Erro(w, http.StatusForbidden, erro)
		case strings.Contains(erro.Error(), "já registrou"):
			respostas.Erro(w, http.StatusConflict, erro)
		default:
			respostas.Erro(w, http.StatusBadRequest, erro)
		}
		return
	}

	avaliacao, erro := repositorios.NovoRepositorioDeAvaliacoes(db).BuscarPorID(avaliacaoID)
	if erro != nil {
		respostas.JSON(w, http.StatusCreated, voto)
		return
	}

	votante, _ := repositorios.NovoRepositorioDeUsuarios(db).BuscarPorID(votanteID)
	ref := avaliacaoID
	servicos.DispararNotificacao(db, avaliacao.UsuarioID, votanteID, "voto_avaliacao", votante.Nome+" reagiu à sua avaliação", "Sua avaliação recebeu um novo voto.", &ref)
	servicos.BroadcastVotosAvaliacao(db, avaliacaoID)

	resposta, erro := montarAvaliacaoComVotos(db, avaliacao, &votanteID)
	if erro != nil {
		respostas.JSON(w, http.StatusCreated, voto)
		return
	}

	respostas.JSON(w, http.StatusCreated, struct {
		Voto      modelos.Voto              `json:"voto"`
		Avaliacao modelos.AvaliacaoComVotos `json:"avaliacao"`
	}{
		Voto:      voto,
		Avaliacao: resposta,
	})
}

func RemoverVotoAvaliacao(w http.ResponseWriter, r *http.Request) {
	avaliacaoID, erro := avaliacaoIDDaURL(r)
	if erro != nil {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}

	votanteID, erro := auth.ExtrairUsuarioID(r)
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

	servico := servicos.NovoServicoVotos(db)
	if erro = servico.RemoverVoto(votanteID, avaliacaoID); erro != nil {
		switch {
		case strings.Contains(erro.Error(), "não encontrada"):
			respostas.Erro(w, http.StatusNotFound, errors.New("Avaliação não encontrada"))
		case strings.Contains(erro.Error(), "Voto não encontrado"):
			respostas.Erro(w, http.StatusNotFound, erro)
		default:
			respostas.Erro(w, http.StatusInternalServerError, erro)
		}
		return
	}

	avaliacao, erro := repositorios.NovoRepositorioDeAvaliacoes(db).BuscarPorID(avaliacaoID)
	if erro != nil {
		respostas.NoContent(w)
		return
	}

	resposta, erro := montarAvaliacaoComVotos(db, avaliacao, &votanteID)
	if erro != nil {
		respostas.NoContent(w)
		return
	}

	servicos.BroadcastVotosAvaliacao(db, avaliacaoID)

	respostas.JSON(w, http.StatusOK, resposta)
}
