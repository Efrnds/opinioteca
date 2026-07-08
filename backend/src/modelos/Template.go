package modelos

import (
	"encoding/json"
	"errors"
	"strings"
	"time"
)

// TemplateEstrutura conteúdo editável do template (armazenado em estrutura_json).
type TemplateEstrutura struct {
	Descricao string `json:"descricao"`
	Texto     string `json:"texto"`
}

// Template representa um modelo de resenha.
type Template struct {
	ID                     uint64            `json:"id"`
	Nome                   string            `json:"nome"`
	AssinaturaMinimaID     uint64            `json:"assinatura_minima_id"`
	Estrutura              TemplateEstrutura `json:"estrutura_json"`
	Ativo                  bool              `json:"ativo"`
	Ordem                  int               `json:"ordem"`
	CriadoEm               time.Time         `json:"criado_em"`
	AssinaturaMinimaNome   string            `json:"assinatura_minima_nome,omitempty"`
	AssinaturaMinimaCodigo string            `json:"assinatura_minima_codigo,omitempty"`
}

// TemplateResenha formato público para seleção na resenha.
type TemplateResenha struct {
	ID        uint64 `json:"id"`
	Nome      string `json:"nome"`
	Descricao string `json:"descricao"`
	Texto     string `json:"texto"`
}

// TemplatePayload corpo de criação/atualização admin.
type TemplatePayload struct {
	Nome               string `json:"nome"`
	Descricao          string `json:"descricao"`
	Texto              string `json:"texto"`
	AssinaturaMinimaID uint64 `json:"assinatura_minima_id"`
	Ativo              *bool  `json:"ativo"`
	Ordem              *int   `json:"ordem"`
}

func (t *Template) ParaResenha() TemplateResenha {
	return TemplateResenha{
		ID:        t.ID,
		Nome:      t.Nome,
		Descricao: t.Estrutura.Descricao,
		Texto:     t.Estrutura.Texto,
	}
}

func (p *TemplatePayload) Preparar(etapa string) error {
	p.Nome = strings.TrimSpace(p.Nome)
	p.Descricao = strings.TrimSpace(p.Descricao)
	p.Texto = strings.TrimSpace(p.Texto)

	if p.Nome == "" {
		return errors.New("o nome do template é obrigatório")
	}
	if p.AssinaturaMinimaID == 0 {
		return errors.New("o plano mínimo é obrigatório")
	}
	if etapa == "criacao" && p.Texto == "" {
		return errors.New("o corpo do template é obrigatório")
	}
	return nil
}

func (p *TemplatePayload) ParaModelo() Template {
	ativo := true
	if p.Ativo != nil {
		ativo = *p.Ativo
	}
	ordem := 0
	if p.Ordem != nil {
		ordem = *p.Ordem
	}
	return Template{
		Nome:               p.Nome,
		AssinaturaMinimaID: p.AssinaturaMinimaID,
		Estrutura: TemplateEstrutura{
			Descricao: p.Descricao,
			Texto:     p.Texto,
		},
		Ativo: ativo,
		Ordem: ordem,
	}
}

func EstruturaTemplateDeJSON(raw []byte) (TemplateEstrutura, error) {
	var estrutura TemplateEstrutura
	if len(raw) == 0 {
		return estrutura, nil
	}
	if erro := json.Unmarshal(raw, &estrutura); erro != nil {
		return estrutura, erro
	}
	return estrutura, nil
}
