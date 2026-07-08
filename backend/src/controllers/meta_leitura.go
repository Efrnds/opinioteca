package controllers

import (
	"backend/src/auth"
	"backend/src/banco"
	"backend/src/modelos"
	"backend/src/repositorios"
	"backend/src/respostas"
	"database/sql"
	"encoding/json"
	"errors"
	"io"
	"math"
	"net/http"

	"github.com/gorilla/mux"
)

func responderMetaLeitura(w http.ResponseWriter, db *sql.DB, usuario modelos.Usuario) {
	if !modelos.TemPlanoPro(usuario) {
		respostas.JSON(w, http.StatusOK, map[string]any{
			"disponivel": false,
			"teaser":     true,
		})
		return
	}

	repoMeta := repositorios.NovoRepositorioDeMetaLeitura(db)
	meta, existe, erro := repoMeta.Buscar(usuario.ID)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	if !existe {
		respostas.JSON(w, http.StatusOK, map[string]any{
			"disponivel":  true,
			"configurada": false,
		})
		return
	}

	repoDiario := repositorios.NovoRepositorioDeDiario(db)
	progresso, erro := repoDiario.CalcularProgressoMeta(usuario.ID, meta.Tipo, meta.Periodo)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	meta.Progresso = progresso
	if meta.Meta > 0 {
		meta.Percentual = math.Min(100, float64(progresso)/float64(meta.Meta)*100)
	}

	respostas.JSON(w, http.StatusOK, map[string]any{
		"disponivel":  true,
		"configurada": true,
		"meta":        meta,
	})
}

func BuscarMetaLeitura(w http.ResponseWriter, r *http.Request) {
	nick := mux.Vars(r)["nick"]

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

	viewerID, erro := auth.ExtrairUsuarioID(r)
	if erro != nil || viewerID != usuario.ID {
		respostas.Erro(w, http.StatusUnauthorized, errors.New("Acesso negado"))
		return
	}

	responderMetaLeitura(w, db, usuario)
}

func SalvarMetaLeitura(w http.ResponseWriter, r *http.Request) {
	nick := mux.Vars(r)["nick"]

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

	viewerID, erro := auth.ExtrairUsuarioID(r)
	if erro != nil || viewerID != usuario.ID {
		respostas.Erro(w, http.StatusUnauthorized, errors.New("Acesso negado"))
		return
	}

	if !modelos.TemPlanoPro(usuario) {
		respostas.Erro(w, http.StatusForbidden, errors.New("Meta de leitura disponível apenas no OpinioPro"))
		return
	}

	corpo, erro := io.ReadAll(r.Body)
	if erro != nil {
		respostas.Erro(w, http.StatusUnprocessableEntity, erro)
		return
	}

	var req modelos.MetaLeituraRequest
	if erro = json.Unmarshal(corpo, &req); erro != nil {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}
	if erro = req.Preparar(); erro != nil {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}

	repoMeta := repositorios.NovoRepositorioDeMetaLeitura(db)
	if erro = repoMeta.Salvar(usuario.ID, req); erro == sql.ErrNoRows {
		respostas.Erro(w, http.StatusServiceUnavailable, errors.New("Migration pendente: execute backend/sql/migrations/20260708_producao.sql"))
		return
	}
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	responderMetaLeitura(w, db, usuario)
}

func AtualizarModoZen(w http.ResponseWriter, r *http.Request) {
	nick := mux.Vars(r)["nick"]

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

	viewerID, erro := auth.ExtrairUsuarioID(r)
	if erro != nil || viewerID != usuario.ID {
		respostas.Erro(w, http.StatusUnauthorized, errors.New("Acesso negado"))
		return
	}

	corpo, erro := io.ReadAll(r.Body)
	if erro != nil {
		respostas.Erro(w, http.StatusUnprocessableEntity, erro)
		return
	}

	var payload struct {
		ModoZen bool `json:"modoZen"`
	}
	if erro = json.Unmarshal(corpo, &payload); erro != nil {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}

	if payload.ModoZen && !modelos.TemPlanoPro(usuario) {
		respostas.Erro(w, http.StatusForbidden, errors.New("Modo Zen disponível apenas no OpinioPro"))
		return
	}

	if erro = repoUsuarios.AtualizarModoZen(usuario.ID, payload.ModoZen); erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	respostas.JSON(w, http.StatusOK, map[string]bool{"modoZen": payload.ModoZen})
}
