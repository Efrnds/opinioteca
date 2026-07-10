package controllers

import (
	"backend/src/auth"
	"backend/src/banco"
	"backend/src/modelos"
	"backend/src/repositorios"
	"backend/src/respostas"
	"backend/src/servicos"
	"database/sql"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
)

func denunciaIDDaURL(r *http.Request) (uint64, error) {
	return strconv.ParseUint(mux.Vars(r)["id"], 10, 64)
}

// AdminListarDenuncias lista denúncias com filtros opcionais de status e tipo.
func AdminListarDenuncias(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")
	tipo := r.URL.Query().Get("tipo")
	pagina, limite, offset := paginacaoAdmin(r)

	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	repo := repositorios.NovoRepositorioDeDenuncias(db)
	itens, total, erro := repo.ListarPaginado(status, tipo, limite, offset)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	if itens == nil {
		itens = []modelos.DenunciaListItem{}
	}

	for i := range itens {
		enriquecerContagensDenuncia(repo, &itens[i])
	}

	pendentes, erro := repo.ContarPendentes()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	respostas.JSON(w, http.StatusOK, modelos.DenunciaListagemResposta{
		Itens:     itens,
		Pendentes: pendentes,
		Total:     total,
		Pagina:    pagina,
		Limite:    limite,
	})
}

// AdminBuscarDenunciaPorID retorna detalhes da denúncia com contexto da entidade.
func AdminBuscarDenunciaPorID(w http.ResponseWriter, r *http.Request) {
	denunciaID, erro := denunciaIDDaURL(r)
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

	repo := repositorios.NovoRepositorioDeDenuncias(db)
	denuncia, erro := repo.BuscarPorID(denunciaID)
	if erro == sql.ErrNoRows {
		respostas.Erro(w, http.StatusNotFound, errors.New("Denúncia não encontrada"))
		return
	}
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	nick, nome, erro := repo.BuscarDenuncianteInfo(denuncia.DenuncianteID)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	contexto, erro := montarContextoDenuncia(db, denuncia.TipoEntidade, denuncia.ReferenciaID)
	if erro != nil {
		if erro == sql.ErrNoRows {
			respostas.Erro(w, http.StatusNotFound, errors.New("Conteúdo denunciado não encontrado"))
			return
		}
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	detalhe := modelos.DenunciaDetalhe{
		Denuncia:        denuncia,
		DenuncianteNick: nick,
		DenuncianteNome: nome,
		Contexto:        contexto,
	}
	enriquecerContagensDenunciaDetalhe(repo, &detalhe)

	respostas.JSON(w, http.StatusOK, detalhe)
}

// AdminResolverDenuncia aplica ação de moderação e resolve a denúncia.
func AdminResolverDenuncia(w http.ResponseWriter, r *http.Request) {
	denunciaID, erro := denunciaIDDaURL(r)
	if erro != nil {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}

	adminID, erro := auth.ExtrairUsuarioID(r)
	if erro != nil {
		respostas.Erro(w, http.StatusUnauthorized, erro)
		return
	}

	corpoRequest, erro := io.ReadAll(r.Body)
	if erro != nil {
		respostas.Erro(w, http.StatusUnprocessableEntity, erro)
		return
	}

	var req modelos.ResolverDenunciaRequest
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

	repoDenuncias := repositorios.NovoRepositorioDeDenuncias(db)
	denuncia, erro := repoDenuncias.BuscarPorID(denunciaID)
	if erro == sql.ErrNoRows {
		respostas.Erro(w, http.StatusNotFound, errors.New("Denúncia não encontrada"))
		return
	}
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	if denuncia.Status != "pendente" && denuncia.Status != "em_analise" {
		respostas.Erro(w, http.StatusBadRequest, errors.New("Esta denúncia já foi resolvida"))
		return
	}

	status := "resolvida"
	resolucao := req.Resolucao

	switch req.Acao {
	case "rejeitar":
		status = "rejeitada"
	case "remover_conteudo":
		if erro = removerConteudoDenunciado(db, denuncia.TipoEntidade, denuncia.ReferenciaID); erro != nil {
			if erro == sql.ErrNoRows {
				respostas.Erro(w, http.StatusNotFound, errors.New("Conteúdo não encontrado"))
				return
			}
			respostas.Erro(w, http.StatusInternalServerError, erro)
			return
		}
		if resolucao == "" {
			resolucao = "Conteúdo removido pelo administrador"
		}
	case "advertir":
		if resolucao == "" {
			resolucao = "Usuário advertido"
		}
	case "inativar_usuario":
		usuarioID, erro := repoDenuncias.UsuarioDenunciadoID(denuncia.TipoEntidade, denuncia.ReferenciaID)
		if erro != nil {
			if erro == sql.ErrNoRows {
				respostas.Erro(w, http.StatusNotFound, errors.New("Usuário não encontrado"))
				return
			}
			respostas.Erro(w, http.StatusInternalServerError, erro)
			return
		}
		repoUsuarios := repositorios.NovoRepositorioDeUsuarios(db)
		if erro = repoUsuarios.Inativar(usuarioID); erro != nil {
			respostas.Erro(w, http.StatusInternalServerError, erro)
			return
		}
		if resolucao == "" {
			resolucao = "Usuário inativado"
		}
	}

	if erro = repoDenuncias.Resolver(denunciaID, adminID, status, resolucao); erro != nil {
		if erro == sql.ErrNoRows {
			respostas.Erro(w, http.StatusConflict, errors.New("Denúncia já foi resolvida"))
			return
		}
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	denunciadoID, _ := repoDenuncias.UsuarioDenunciadoID(denuncia.TipoEntidade, denuncia.ReferenciaID)
	if status == "resolvida" {
		refDenuncia := denunciaID
		servicos.DispararNotificacaoSistema(
			db,
			denuncia.DenuncianteID,
			modelos.TipoNotificacaoDenunciaResolvida,
			"Denúncia analisada",
			"A moderação tomou providências com base na sua denúncia. Obrigado por ajudar a manter a comunidade segura.",
			&refDenuncia,
		)

		switch req.Acao {
		case "advertir":
			if denunciadoID > 0 {
				servicos.DispararNotificacaoSistema(
					db,
					denunciadoID,
					modelos.TipoNotificacaoAdvertencia,
					"Advertência da moderação",
					resolucao,
					&refDenuncia,
				)
			}
		case "inativar_usuario":
			if denunciadoID > 0 {
				servicos.DispararNotificacaoSistema(
					db,
					denunciadoID,
					modelos.TipoNotificacaoContaInativada,
					"Conta inativada",
					"Sua conta foi inativada por violação das regras da comunidade.",
					nil,
				)
			}
		}

		if denunciadoID > 0 && req.Acao != "inativar_usuario" {
			aplicarAutoBanSeNecessario(db, repoDenuncias, denunciadoID)
		}
	}

	respostas.NoContent(w)
}

func enriquecerContagensDenuncia(repo *repositorios.Denuncias, item *modelos.DenunciaListItem) {
	usuarioID, erro := repo.UsuarioDenunciadoID(item.TipoEntidade, item.ReferenciaID)
	if erro != nil {
		return
	}
	if total, erro := repo.ContarDenunciasContraUsuario(usuarioID); erro == nil {
		item.DenunciasContraUsuario = total
	}
	if procedentes, erro := repo.ContarDenunciasProcedentesContraUsuario(usuarioID); erro == nil {
		item.DenunciasProcedentes = procedentes
	}
}

func enriquecerContagensDenunciaDetalhe(repo *repositorios.Denuncias, detalhe *modelos.DenunciaDetalhe) {
	usuarioID, erro := repo.UsuarioDenunciadoID(detalhe.TipoEntidade, detalhe.ReferenciaID)
	if erro != nil {
		return
	}
	if total, erro := repo.ContarDenunciasContraUsuario(usuarioID); erro == nil {
		detalhe.DenunciasContraUsuario = total
	}
	if procedentes, erro := repo.ContarDenunciasProcedentesContraUsuario(usuarioID); erro == nil {
		detalhe.DenunciasProcedentes = procedentes
	}
}

func aplicarAutoBanSeNecessario(db *sql.DB, repoDenuncias *repositorios.Denuncias, denunciadoID uint64) {
	procedentes, erro := repoDenuncias.ContarDenunciasProcedentesContraUsuario(denunciadoID)
	if erro != nil || procedentes < modelos.LimiteDenunciasProcedentesAutoBan {
		return
	}

	repoUsuarios := repositorios.NovoRepositorioDeUsuarios(db)
	usuario, erro := repoUsuarios.BuscarPorID(denunciadoID)
	if erro != nil || usuario.Status == "inativo" {
		return
	}

	if erro = repoUsuarios.Inativar(denunciadoID); erro != nil {
		return
	}

	servicos.DispararNotificacaoSistema(
		db,
		denunciadoID,
		modelos.TipoNotificacaoContaInativada,
		"Conta inativada automaticamente",
		"Sua conta foi inativada após múltiplas denúncias procedentes contra você.",
		nil,
	)
}

func montarContextoDenuncia(db *sql.DB, tipoEntidade string, referenciaID uint64) (any, error) {
	switch tipoEntidade {
	case modelos.TipoEntidadeAvaliacao:
		repo := repositorios.NovoRepositorioDeAvaliacoes(db)
		avaliacao, erro := repo.BuscarPorID(referenciaID)
		if erro != nil {
			return nil, erro
		}
		repoUsuarios := repositorios.NovoRepositorioDeUsuarios(db)
		usuario, erro := repoUsuarios.BuscarPorID(avaliacao.UsuarioID)
		if erro != nil {
			return nil, erro
		}
		return modelos.DenunciaContextoAvaliacao{
			ID:        avaliacao.ID,
			Texto:     avaliacao.Texto,
			Nota:      avaliacao.Nota,
			AutorID:   usuario.ID,
			AutorNick: usuario.Nick,
			AutorNome: usuario.Nome,
		}, nil

	case modelos.TipoEntidadeComentario:
		repo := repositorios.NovoRepositorioDeComentarios(db)
		comentario, erro := repo.BuscarPorID(referenciaID)
		if erro != nil {
			return nil, erro
		}
		repoUsuarios := repositorios.NovoRepositorioDeUsuarios(db)
		usuario, erro := repoUsuarios.BuscarPorID(comentario.UsuarioID)
		if erro != nil {
			return nil, erro
		}
		return modelos.DenunciaContextoComentario{
			ID:          comentario.ID,
			Texto:       comentario.Texto,
			AvaliacaoID: comentario.AvaliacaoID,
			AutorID:     usuario.ID,
			AutorNick:   usuario.Nick,
			AutorNome:   usuario.Nome,
		}, nil

	case modelos.TipoEntidadeUsuario:
		repo := repositorios.NovoRepositorioDeUsuarios(db)
		usuario, erro := repo.BuscarPorID(referenciaID)
		if erro != nil {
			return nil, erro
		}
		if usuario.ID == 0 {
			return nil, sql.ErrNoRows
		}
		return modelos.DenunciaContextoUsuario{
			ID:    usuario.ID,
			Nick:  usuario.Nick,
			Email: usuario.Email,
			Nome:  usuario.Nome,
		}, nil

	case modelos.TipoEntidadeMensagem:
		repo := repositorios.NovoRepositorioDeMensagens(db)
		mensagem, erro := repo.BuscarMensagemAdminPorID(referenciaID)
		if erro != nil {
			return nil, erro
		}
		repoUsuarios := repositorios.NovoRepositorioDeUsuarios(db)
		usuario, erro := repoUsuarios.BuscarPorID(mensagem.RemetenteID)
		if erro != nil {
			return nil, erro
		}
		return modelos.DenunciaContextoMensagem{
			ID:            mensagem.ID,
			Texto:         mensagem.Conteudo,
			RemetenteID:   mensagem.RemetenteID,
			RemetenteNick: usuario.Nick,
			RemetenteNome: usuario.Nome,
			CriadoEm:      mensagem.CriadoEm,
		}, nil

	default:
		return nil, errors.New("tipo_entidade inválido")
	}
}

func autorDaEntidadeDenunciada(db *sql.DB, tipoEntidade string, referenciaID uint64) (uint64, error) {
	return repositorios.NovoRepositorioDeDenuncias(db).UsuarioDenunciadoID(tipoEntidade, referenciaID)
}

func removerConteudoDenunciado(db *sql.DB, tipoEntidade string, referenciaID uint64) error {
	switch tipoEntidade {
	case modelos.TipoEntidadeAvaliacao:
		return repositorios.NovoRepositorioDeAvaliacoes(db).DeletarPorAdmin(referenciaID)
	case modelos.TipoEntidadeComentario:
		return repositorios.NovoRepositorioDeComentarios(db).DeletarPorAdmin(referenciaID)
	case modelos.TipoEntidadeMensagem:
		return repositorios.NovoRepositorioDeMensagens(db).ApagarPorAdmin(referenciaID)
	case modelos.TipoEntidadeUsuario:
		return repositorios.NovoRepositorioDeUsuarios(db).Inativar(referenciaID)
	default:
		return errors.New("tipo_entidade inválido")
	}
}
