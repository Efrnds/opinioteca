package controllers

import (
	"backend/src/model/banco"
	"backend/src/model/modelos"
	"backend/src/model/repositorios"
	"backend/src/utils/respostas"
	"database/sql"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
)

// Lista templates avaliacao nos modelos de texto.
func ListarTemplatesAvaliacao(w http.ResponseWriter, r *http.Request) {
	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	repositorio := repositorios.NovoRepositorioDeTemplates(db)
	templates, erro := repositorio.ListarAtivos()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	resultado := make([]modelos.TemplateAvaliacao, 0, len(templates))
	for _, template := range templates {
		resultado = append(resultado, template.ParaAvaliacao())
	}
	respostas.JSON(w, http.StatusOK, resultado)
}

// AdminListarTemplates: listar templates nos modelos de texto.
func AdminListarTemplates(w http.ResponseWriter, r *http.Request) {
	pagina, limite, offset := paginacaoAdmin(r)

	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	repositorio := repositorios.NovoRepositorioDeTemplates(db)
	templates, total, erro := repositorio.ListarAdminPaginado(limite, offset)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	if templates == nil {
		templates = []modelos.Template{}
	}
	respostas.JSON(w, http.StatusOK, modelos.RespostaPaginada{
		Itens:  templates,
		Total:  total,
		Pagina: pagina,
		Limite: limite,
	})
}

// AdminBuscarTemplatePorID: buscar template por id nos modelos de texto.
func AdminBuscarTemplatePorID(w http.ResponseWriter, r *http.Request) {
	id, erro := templateIDDaURL(r)
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

	repositorio := repositorios.NovoRepositorioDeTemplates(db)
	template, erro := repositorio.BuscarPorID(id)
	if erro != nil {
		if errors.Is(erro, sql.ErrNoRows) {
			respostas.Erro(w, http.StatusNotFound, errors.New("template não encontrado"))
			return
		}
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	respostas.JSON(w, http.StatusOK, template)
}

// AdminCriarTemplate: criar template nos modelos de texto.
func AdminCriarTemplate(w http.ResponseWriter, r *http.Request) {
	payload, erro := lerPayloadTemplate(r, "criacao")
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

	template := payload.ParaModelo()
	repositorio := repositorios.NovoRepositorioDeTemplates(db)
	template.ID, erro = repositorio.Criar(template)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	criado, erro := repositorio.BuscarPorID(template.ID)
	if erro != nil {
		respostas.JSON(w, http.StatusCreated, template)
		return
	}
	respostas.JSON(w, http.StatusCreated, criado)
}

// AdminAtualizarTemplate: atualizar template nos modelos de texto.
func AdminAtualizarTemplate(w http.ResponseWriter, r *http.Request) {
	id, erro := templateIDDaURL(r)
	if erro != nil {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}

	payload, erro := lerPayloadTemplate(r, "atualizacao")
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

	repositorio := repositorios.NovoRepositorioDeTemplates(db)
	existente, erro := repositorio.BuscarPorID(id)
	if erro != nil {
		if errors.Is(erro, sql.ErrNoRows) {
			respostas.Erro(w, http.StatusNotFound, errors.New("template não encontrado"))
			return
		}
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	template := payload.ParaModelo()
	if payload.Texto == "" {
		template.Estrutura.Texto = existente.Estrutura.Texto
	}
	if payload.Ativo == nil {
		template.Ativo = existente.Ativo
	}
	if payload.Ordem == nil {
		template.Ordem = existente.Ordem
	}

	if erro = repositorio.Atualizar(id, template); erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	respostas.JSON(w, http.StatusNoContent, nil)
}

// AdminExcluirTemplate: excluir template nos modelos de texto.
func AdminExcluirTemplate(w http.ResponseWriter, r *http.Request) {
	id, erro := templateIDDaURL(r)
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

	repositorio := repositorios.NovoRepositorioDeTemplates(db)
	if _, erro = repositorio.BuscarPorID(id); erro != nil {
		if errors.Is(erro, sql.ErrNoRows) {
			respostas.Erro(w, http.StatusNotFound, errors.New("template não encontrado"))
			return
		}
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	total, erro := repositorio.ContarUsoEmAvaliacoes(id)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	if total > 0 {
		if erro = repositorio.Inativar(id); erro != nil {
			respostas.Erro(w, http.StatusInternalServerError, erro)
			return
		}
		respostas.JSON(w, http.StatusOK, map[string]any{
			"inativado": true,
			"mensagem":  "Template inativado porque está em uso em avaliações.",
		})
		return
	}

	if erro = repositorio.Excluir(id); erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	respostas.JSON(w, http.StatusNoContent, nil)
}

// templateIDDaURL: id da url nos modelos de texto.
func templateIDDaURL(r *http.Request) (uint64, error) {
	parametros := mux.Vars(r)
	return strconv.ParseUint(parametros["id"], 10, 64)
}

// lerPayloadTemplate: payload template nos modelos de texto.
func lerPayloadTemplate(r *http.Request, etapa string) (modelos.TemplatePayload, error) {
	corpoRequest, erro := io.ReadAll(r.Body)
	if erro != nil {
		return modelos.TemplatePayload{}, erro
	}

	var payload modelos.TemplatePayload
	if erro = json.Unmarshal(corpoRequest, &payload); erro != nil {
		return modelos.TemplatePayload{}, erro
	}
	if erro = payload.Preparar(etapa); erro != nil {
		return modelos.TemplatePayload{}, erro
	}
	return payload, nil
}
