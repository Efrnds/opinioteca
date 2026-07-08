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
	"net/http"

	"github.com/jackc/pgx/v5/pgconn"
)

func CriarDenuncia(w http.ResponseWriter, r *http.Request) {
	denuncianteID, erro := auth.ExtrairUsuarioID(r)
	if erro != nil {
		respostas.Erro(w, http.StatusUnauthorized, erro)
		return
	}

	corpoRequest, erro := io.ReadAll(r.Body)
	if erro != nil {
		respostas.Erro(w, http.StatusUnprocessableEntity, erro)
		return
	}

	var req modelos.CriarDenunciaRequest
	if erro = json.Unmarshal(corpoRequest, &req); erro != nil {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}
	if erro = req.Preparar(); erro != nil {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}

	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	autorID, erro := buscarAutorEntidadeDenunciada(db, req.TipoEntidade, req.ReferenciaID, denuncianteID)
	if erro != nil {
		if erro == sql.ErrNoRows {
			respostas.Erro(w, http.StatusNotFound, errors.New("Conteúdo não encontrado"))
			return
		}
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}

	if autorID == denuncianteID {
		respostas.Erro(w, http.StatusBadRequest, errors.New("Você não pode denunciar seu próprio conteúdo"))
		return
	}

	var descricao *string
	if req.Descricao != "" {
		descricao = &req.Descricao
	}

	repo := repositorios.NovoRepositorioDeDenuncias(db)
	criada, erro := repo.Criar(modelos.Denuncia{
		DenuncianteID: denuncianteID,
		TipoEntidade:  req.TipoEntidade,
		ReferenciaID:  req.ReferenciaID,
		Motivo:        req.Motivo,
		Descricao:     descricao,
	})
	if erro != nil {
		var pgErro *pgconn.PgError
		if errors.As(erro, &pgErro) && pgErro.Code == "23505" {
			respostas.Erro(w, http.StatusConflict, errors.New("Você já denunciou este conteúdo"))
			return
		}
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	respostas.JSON(w, http.StatusCreated, criada)
}

func buscarAutorEntidadeDenunciada(db *sql.DB, tipoEntidade string, referenciaID, denuncianteID uint64) (uint64, error) {
	switch tipoEntidade {
	case modelos.TipoEntidadeAvaliacao:
		return repositorios.NovoRepositorioDeDenuncias(db).UsuarioDenunciadoID(tipoEntidade, referenciaID)

	case modelos.TipoEntidadeComentario:
		return repositorios.NovoRepositorioDeDenuncias(db).UsuarioDenunciadoID(tipoEntidade, referenciaID)

	case modelos.TipoEntidadeUsuario:
		return repositorios.NovoRepositorioDeDenuncias(db).UsuarioDenunciadoID(tipoEntidade, referenciaID)

	case modelos.TipoEntidadeMensagem:
		repo := repositorios.NovoRepositorioDeMensagens(db)
		if denuncianteID > 0 {
			if _, erro := repo.BuscarMensagemPorID(denuncianteID, referenciaID); erro != nil {
				if erro == sql.ErrNoRows {
					return 0, errors.New("Você só pode denunciar mensagens de conversas em que participa")
				}
				return 0, erro
			}
		}
		return repositorios.NovoRepositorioDeDenuncias(db).UsuarioDenunciadoID(tipoEntidade, referenciaID)

	default:
		return 0, errors.New("tipo_entidade inválido")
	}
}
