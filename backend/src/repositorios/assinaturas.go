package repositorios

import (
	"backend/src/modelos"
	"database/sql"
	"fmt"
	"time"
)

// Assinaturas repositório de planos/assinaturas.
type Assinaturas struct {
	db *sql.DB
}

// NovoRepositorioDeAssinaturas cria o repositório.
func NovoRepositorioDeAssinaturas(db *sql.DB) *Assinaturas {
	return &Assinaturas{db}
}

// Listar retorna todos os planos ativos do catálogo.
func (repositorio Assinaturas) Listar() ([]modelos.AssinaturaCatalogo, error) {
	linhas, erro := repositorio.db.Query(`
		SELECT id, codigo, nome, nivel, analise_sentimento, modo_zen, templates_enriquecidos, preco_mensal, preco_anual
		FROM assinaturas
		WHERE ativo = TRUE
		ORDER BY nivel`)
	if erro != nil {
		return nil, erro
	}
	defer linhas.Close()

	resultado := make([]modelos.AssinaturaCatalogo, 0)
	for linhas.Next() {
		var item modelos.AssinaturaCatalogo
		if erro := linhas.Scan(
			&item.ID,
			&item.Codigo,
			&item.Nome,
			&item.Nivel,
			&item.AnaliseSentimento,
			&item.ModoZen,
			&item.TemplatesEnriquecidos,
			&item.PrecoMensal,
			&item.PrecoAnual,
		); erro != nil {
			return nil, erro
		}
		resultado = append(resultado, item)
	}
	return resultado, nil
}

// AtribuirPlano substitui plano e expiração de um usuário (upsert admin).
// expiraEm nil grava NULL no banco (gratuito ou sem data).
func (repositorio Usuarios) AtribuirPlano(usuarioID, assinaturaID uint64, expiraEm *time.Time) error {
	if !schemaTemAssinaturaExpiraEm(repositorio.db) {
		return fmt.Errorf("migration pendente: execute backend/sql/migrations/20260708_producao.sql")
	}
	_, erro := repositorio.db.Exec(
		`UPDATE usuarios SET assinatura_id = $1, assinatura_expira_em = $2 WHERE id = $3`,
		assinaturaID, parametroTimestamp(expiraEm), usuarioID,
	)
	return erro
}

func parametroTimestamp(valor *time.Time) interface{} {
	if valor == nil || !modelos.TempoJSONSeguro(*valor) {
		return nil
	}
	return *valor
}

// RevogarPlano volta o usuário ao plano gratuito sem expiração.
func (repositorio Usuarios) RevogarPlano(usuarioID uint64) error {
	return repositorio.AtribuirPlano(usuarioID, modelos.PlanoGratuitoID, nil)
}
