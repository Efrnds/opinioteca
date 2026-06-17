package servicos

import (
	"backend/src/modelos"
	"backend/src/repositorios"
	"database/sql"
	"errors"
)

type Votos struct {
	db             *sql.DB
	repoVotos      *repositorios.Votos
	repoAvaliacoes *repositorios.Avaliacoes
	repoUsuarios   *repositorios.Usuarios
}

func NovoServicoVotos(db *sql.DB) *Votos {
	return &Votos{
		db:             db,
		repoVotos:      repositorios.NovoRepositorioDeVotos(db),
		repoAvaliacoes: repositorios.NovoRepositorioDeAvaliacoes(db),
		repoUsuarios:   repositorios.NovoRepositorioDeUsuarios(db),
	}
}

func (s *Votos) Votar(votanteID, avaliacaoID uint64, tipoVoto string) (modelos.Voto, error) {
	avaliacao, erro := s.repoAvaliacoes.BuscarPorID(avaliacaoID)
	if erro == sql.ErrNoRows {
		return modelos.Voto{}, errors.New("Avaliação não encontrada")
	}
	if erro != nil {
		return modelos.Voto{}, erro
	}

	if avaliacao.UsuarioID == votanteID {
		return modelos.Voto{}, errors.New("Você não pode votar na sua própria avaliação")
	}

	tx, erro := s.db.Begin()
	if erro != nil {
		return modelos.Voto{}, erro
	}
	defer tx.Rollback()

	votoExistente, erro := s.repoVotos.BuscarPorUsuarioEAvaliacao(votanteID, avaliacaoID)
	deltaRank := 0

	if erro == nil {
		if votoExistente.TipoVoto == tipoVoto {
			return modelos.Voto{}, errors.New("Você já registrou este voto nesta avaliação")
		}
		deltaRank = modelos.DeltaRank(tipoVoto) - modelos.DeltaRank(votoExistente.TipoVoto)
		if erro = s.repoVotos.Atualizar(tx, votoExistente.ID, tipoVoto); erro != nil {
			return modelos.Voto{}, erro
		}
		votoExistente.TipoVoto = tipoVoto
	} else if erro == sql.ErrNoRows {
		deltaRank = modelos.DeltaRank(tipoVoto)
		voto := modelos.Voto{
			UsuarioID:   votanteID,
			AvaliacaoID: avaliacaoID,
			TipoVoto:    tipoVoto,
		}
		voto.ID, erro = s.repoVotos.Criar(tx, voto)
		if erro != nil {
			return modelos.Voto{}, erro
		}
		votoExistente = voto
	} else {
		return modelos.Voto{}, erro
	}

	if erro = s.repoUsuarios.AtualizarRank(tx, avaliacao.UsuarioID, deltaRank); erro != nil {
		return modelos.Voto{}, erro
	}

	if erro = tx.Commit(); erro != nil {
		return modelos.Voto{}, erro
	}

	return votoExistente, nil
}

func (s *Votos) RemoverVoto(votanteID, avaliacaoID uint64) error {
	avaliacao, erro := s.repoAvaliacoes.BuscarPorID(avaliacaoID)
	if erro == sql.ErrNoRows {
		return errors.New("Avaliação não encontrada")
	}
	if erro != nil {
		return erro
	}

	voto, erro := s.repoVotos.BuscarPorUsuarioEAvaliacao(votanteID, avaliacaoID)
	if erro == sql.ErrNoRows {
		return errors.New("Voto não encontrado")
	}
	if erro != nil {
		return erro
	}

	tx, erro := s.db.Begin()
	if erro != nil {
		return erro
	}
	defer tx.Rollback()

	if erro = s.repoVotos.Deletar(tx, votanteID, avaliacaoID); erro != nil {
		return erro
	}

	deltaRank := -modelos.DeltaRank(voto.TipoVoto)
	if erro = s.repoUsuarios.AtualizarRank(tx, avaliacao.UsuarioID, deltaRank); erro != nil {
		return erro
	}

	return tx.Commit()
}
