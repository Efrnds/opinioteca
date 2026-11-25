package repositorios

import (
	"backend/src/model/modelos"
	"database/sql"
	"encoding/json"
)

type Templates struct {
	db *sql.DB
}

func NovoRepositorioDeTemplates(db *sql.DB) *Templates {
	return &Templates{db}
}

func (repositorio Templates) scanLinha(
	scan func(dest ...any) error,
) (modelos.Template, error) {
	var template modelos.Template
	var estruturaRaw []byte

	if erro := scan(
		&template.ID,
		&template.Nome,
		&template.AssinaturaMinimaID,
		&estruturaRaw,
		&template.Ativo,
		&template.Ordem,
		&template.CriadoEm,
		&template.AssinaturaMinimaNome,
		&template.AssinaturaMinimaCodigo,
	); erro != nil {
		return modelos.Template{}, erro
	}

	estrutura, erro := modelos.EstruturaTemplateDeJSON(estruturaRaw)
	if erro != nil {
		return modelos.Template{}, erro
	}
	template.Estrutura = estrutura
	return template, nil
}

const selectTemplatesBase = `
	SELECT t.id, t.nome, t.assinatura_minima_id, t.estrutura_json, t.ativo, t.ordem, t.criadoEm,
	       a.nome, a.codigo
	FROM templates t
	JOIN assinaturas a ON a.id = t.assinatura_minima_id`

func (repositorio Templates) ListarAdmin() ([]modelos.Template, error) {
	templates, _, erro := repositorio.ListarAdminPaginado(100000, 0)
	return templates, erro
}

func (repositorio Templates) ListarAdminPaginado(limite, offset int) ([]modelos.Template, int, error) {
	if limite <= 0 {
		limite = 20
	}
	if offset < 0 {
		offset = 0
	}

	var total int
	if erro := repositorio.db.QueryRow(`SELECT COUNT(*) FROM templates`).Scan(&total); erro != nil {
		return nil, 0, erro
	}

	linhas, erro := repositorio.db.Query(
		selectTemplatesBase+` ORDER BY t.ordem, t.id LIMIT $1 OFFSET $2`,
		limite,
		offset,
	)
	if erro != nil {
		return nil, 0, erro
	}
	defer linhas.Close()

	var templates []modelos.Template
	for linhas.Next() {
		template, erro := repositorio.scanLinha(linhas.Scan)
		if erro != nil {
			return nil, 0, erro
		}
		templates = append(templates, template)
	}
	return templates, total, nil
}

func (repositorio Templates) ListarAtivos() ([]modelos.Template, error) {
	linhas, erro := repositorio.db.Query(selectTemplatesBase + ` WHERE t.ativo = TRUE ORDER BY t.ordem, t.id`)
	if erro != nil {
		return nil, erro
	}
	defer linhas.Close()

	var templates []modelos.Template
	for linhas.Next() {
		template, erro := repositorio.scanLinha(linhas.Scan)
		if erro != nil {
			return nil, erro
		}
		templates = append(templates, template)
	}
	return templates, nil
}

func (repositorio Templates) BuscarPorID(id uint64) (modelos.Template, error) {
	linha := repositorio.db.QueryRow(selectTemplatesBase+` WHERE t.id = $1`, id)
	template, erro := repositorio.scanLinha(linha.Scan)
	if erro == sql.ErrNoRows {
		return modelos.Template{}, sql.ErrNoRows
	}
	return template, erro
}

func (repositorio Templates) Criar(template modelos.Template) (uint64, error) {
	estruturaJSON, erro := json.Marshal(template.Estrutura)
	if erro != nil {
		return 0, erro
	}

	var id uint64
	erro = repositorio.db.QueryRow(`
		INSERT INTO templates (nome, assinatura_minima_id, estrutura_json, ativo, ordem)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id`,
		template.Nome,
		template.AssinaturaMinimaID,
		estruturaJSON,
		template.Ativo,
		template.Ordem,
	).Scan(&id)
	return id, erro
}

func (repositorio Templates) Atualizar(id uint64, template modelos.Template) error {
	estruturaJSON, erro := json.Marshal(template.Estrutura)
	if erro != nil {
		return erro
	}

	_, erro = repositorio.db.Exec(`
		UPDATE templates
		SET nome = $1, assinatura_minima_id = $2, estrutura_json = $3, ativo = $4, ordem = $5
		WHERE id = $6`,
		template.Nome,
		template.AssinaturaMinimaID,
		estruturaJSON,
		template.Ativo,
		template.Ordem,
		id,
	)
	return erro
}

func (repositorio Templates) ContarUsoEmAvaliacoes(id uint64) (int64, error) {
	var total int64
	erro := repositorio.db.QueryRow(
		`SELECT COUNT(*) FROM avaliacoes WHERE template_id = $1`,
		id,
	).Scan(&total)
	return total, erro
}

func (repositorio Templates) Inativar(id uint64) error {
	_, erro := repositorio.db.Exec(`UPDATE templates SET ativo = FALSE WHERE id = $1`, id)
	return erro
}

func (repositorio Templates) Excluir(id uint64) error {
	_, erro := repositorio.db.Exec(`DELETE FROM templates WHERE id = $1`, id)
	return erro
}
