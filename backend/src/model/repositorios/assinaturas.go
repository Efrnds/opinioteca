package repositorios

import (
	"backend/src/model/modelos"
	"database/sql"
	"fmt"
	"time"
)

type Assinaturas struct {
	db *sql.DB
}

func NovoRepositorioDeAssinaturas(db *sql.DB) *Assinaturas {
	return &Assinaturas{db}
}

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

func (repositorio Usuarios) AtribuirPlano(usuarioID, assinaturaID uint64, expiraEm *time.Time) error {
	if !schemaTemAssinaturaExpiraEm(repositorio.db) {
		return fmt.Errorf("migration pendente: execute backend/sql/migrations/20260708_producao.sql")
	}
	_, erro := repositorio.db.Exec(
		`UPDATE usuarios SET
			assinatura_id = $1,
			assinatura_expira_em = $2,
			modo_zen = CASE
				WHEN $1 = $4 AND ($2::timestamptz IS NULL OR $2 > NOW()) THEN modo_zen
				ELSE FALSE
			END
		WHERE id = $3`,
		assinaturaID, parametroTimestamp(expiraEm), usuarioID, modelos.PlanoOpinioProID,
	)
	return erro
}

func (repositorio Usuarios) GarantirPrivilegiosPro(usuario *modelos.Usuario) error {
	if usuario == nil || usuario.ID == 0 {
		return nil
	}
	if !usuario.ModoZen || modelos.TemPlanoPro(*usuario) {
		return nil
	}
	if erro := repositorio.AtualizarModoZen(usuario.ID, false); erro != nil {
		return erro
	}
	usuario.ModoZen = false
	return nil
}

func parametroTimestamp(valor *time.Time) interface{} {
	if valor == nil || !modelos.TempoJSONSeguro(*valor) {
		return nil
	}
	return *valor
}

func (repositorio Usuarios) RevogarPlano(usuarioID uint64) error {
	return repositorio.AtribuirPlano(usuarioID, modelos.PlanoGratuitoID, nil)
}
