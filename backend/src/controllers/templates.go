package controllers

import (
	"backend/src/banco"
	"backend/src/modelos"
	"backend/src/repositorios"
	"backend/src/respostas"
	"database/sql"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
)

// ListarTemplatesResenha retorna modelos ativos para a criação de resenhas.
func ListarTemplatesResenha(w http.ResponseWriter, r *http.Request) {
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

	resultado := make([]modelos.TemplateResenha, 0, len(templates))
	for _, template := range templates {
		resultado = append(resultado, template.ParaResenha())
	}
	respostas.JSON(w, http.StatusOK, resultado)
}

// AdminListarTemplates lista todos os templates (admin).
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

// AdminBuscarTemplatePorID retorna um template pelo ID (admin).
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

// AdminCriarTemplate cria um novo template (admin).
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

// AdminAtualizarTemplate atualiza um template (admin).
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

// AdminExcluirTemplate remove ou inativa um template (admin).
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
			"mensagem":  "Template inativado porque está em uso em resenhas.",
		})
		return
	}

	if erro = repositorio.Excluir(id); erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	respostas.JSON(w, http.StatusNoContent, nil)
}

func templateIDDaURL(r *http.Request) (uint64, error) {
	parametros := mux.Vars(r)
	return strconv.ParseUint(parametros["id"], 10, 64)
}

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
