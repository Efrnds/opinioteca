package servicos

import (
	"backend/src/modelos"
	"backend/src/repositorios"
	"backend/src/websockets"
	"database/sql"
)

type avaliacaoAtualizadaPayload struct {
	AvaliacaoID        uint64                      `json:"avaliacao_id"`
	Votos              *modelos.ContadoresVoto     `json:"votos,omitempty"`
	QtdComentarios     *int                        `json:"qtd_comentarios,omitempty"`
	ComentarioDestaque *modelos.ComentarioResposta `json:"comentario_destaque,omitempty"`
}

type novoComentarioPayload struct {
	AvaliacaoID        uint64                      `json:"avaliacao_id"`
	Comentario         modelos.ComentarioResposta  `json:"comentario"`
	QtdComentarios     int                         `json:"qtd_comentarios"`
	ComentarioDestaque *modelos.ComentarioResposta `json:"comentario_destaque,omitempty"`
}

type comentarioAtualizadoPayload struct {
	AvaliacaoID        uint64                      `json:"avaliacao_id"`
	Comentario         modelos.ComentarioResposta  `json:"comentario"`
	ComentarioDestaque *modelos.ComentarioResposta `json:"comentario_destaque,omitempty"`
}

func contarComentariosAvaliacao(db *sql.DB, avaliacaoID uint64) (int, error) {
	var total int
	erro := db.QueryRow(
		`SELECT COUNT(*) FROM comentarios WHERE avaliacao_id = $1`,
		avaliacaoID,
	).Scan(&total)
	return total, erro
}

func buscarDestaqueAvaliacao(db *sql.DB, avaliacaoID uint64) *modelos.ComentarioResposta {
	repo := repositorios.NovoRepositorioDeComentarios(db)
	destaques, erro := repo.BuscarDestaquesPorAvaliacoes([]uint64{avaliacaoID})
	if erro != nil {
		return nil
	}
	return destaques[avaliacaoID]
}

func BroadcastVotosAvaliacao(db *sql.DB, avaliacaoID uint64) {
	repoVotos := repositorios.NovoRepositorioDeVotos(db)
	votos, erro := repoVotos.ContarPorAvaliacao(avaliacaoID)
	if erro != nil {
		return
	}

	websockets.Broadcast("AVALIACAO_ATUALIZADA", avaliacaoAtualizadaPayload{
		AvaliacaoID: avaliacaoID,
		Votos:       &votos,
	})
}

func BroadcastNovoComentario(db *sql.DB, avaliacaoID uint64, comentario modelos.ComentarioResposta) {
	qtd, erro := contarComentariosAvaliacao(db, avaliacaoID)
	if erro != nil {
		return
	}

	destaque := buscarDestaqueAvaliacao(db, avaliacaoID)

	websockets.Broadcast("NOVO_COMENTARIO", novoComentarioPayload{
		AvaliacaoID:        avaliacaoID,
		Comentario:         comentario,
		QtdComentarios:     qtd,
		ComentarioDestaque: destaque,
	})
}

func BroadcastComentarioAtualizado(db *sql.DB, avaliacaoID uint64, comentario modelos.ComentarioResposta) {
	destaque := buscarDestaqueAvaliacao(db, avaliacaoID)

	websockets.Broadcast("COMENTARIO_ATUALIZADO", comentarioAtualizadoPayload{
		AvaliacaoID:        avaliacaoID,
		Comentario:         comentario,
		ComentarioDestaque: destaque,
	})
}
