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
	"time"

	"github.com/gorilla/mux"

)



func BuscarInboxMensagens(w http.ResponseWriter, r *http.Request) {

	meuID, erro := auth.ExtrairUsuarioID(r)

	if erro != nil {

		respostas.Erro(w, http.StatusUnauthorized, erro)

		return

	}



	db, erro := banco.Conectar()

	if erro != nil {

		respostas.Erro(w, http.StatusInternalServerError, erro)

		return

	}

	defer db.Close()



	repo := repositorios.NovoRepositorioDeMensagens(db)

	conversas, erro := repo.BuscarConversas(meuID)

	if erro != nil {

		respostas.Erro(w, http.StatusInternalServerError, erro)

		return

	}



	if conversas == nil {

		conversas = []modelos.ConversaResumo{}

	}



	respostas.JSON(w, http.StatusOK, conversas)

}



func ContarMensagensNaoLidas(w http.ResponseWriter, r *http.Request) {

	meuID, erro := auth.ExtrairUsuarioID(r)

	if erro != nil {

		respostas.Erro(w, http.StatusUnauthorized, erro)

		return

	}



	db, erro := banco.Conectar()

	if erro != nil {

		respostas.Erro(w, http.StatusInternalServerError, erro)

		return

	}

	defer db.Close()



	total, erro := repositorios.NovoRepositorioDeMensagens(db).ContarNaoLidasTotal(meuID)

	if erro != nil {

		respostas.Erro(w, http.StatusInternalServerError, erro)

		return

	}



	respostas.JSON(w, http.StatusOK, map[string]int{"total": total})

}



func BuscarHistoricoMensagens(w http.ResponseWriter, r *http.Request) {

	meuID, erro := auth.ExtrairUsuarioID(r)

	if erro != nil {

		respostas.Erro(w, http.StatusUnauthorized, erro)

		return

	}



	outroID, erro := strconv.ParseUint(mux.Vars(r)["usuarioId"], 10, 64)

	if erro != nil || outroID == 0 {

		respostas.Erro(w, http.StatusBadRequest, erro)

		return

	}



	db, erro := banco.Conectar()

	if erro != nil {

		respostas.Erro(w, http.StatusInternalServerError, erro)

		return

	}

	defer db.Close()



	repo := repositorios.NovoRepositorioDeMensagens(db)

	mensagens, erro := repo.BuscarHistorico(meuID, outroID)

	if erro != nil {

		respostas.Erro(w, http.StatusInternalServerError, erro)

		return

	}



	if mensagens == nil {

		mensagens = []modelos.Mensagem{}

	}

	if erro = repo.MarcarConversaComoLida(meuID, outroID); erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	servicos.BroadcastConversaLida(db, meuID, outroID)

	respostas.JSON(w, http.StatusOK, mensagens)

}



func EnviarMensagem(w http.ResponseWriter, r *http.Request) {

	meuID, erro := auth.ExtrairUsuarioID(r)

	if erro != nil {

		respostas.Erro(w, http.StatusUnauthorized, erro)

		return

	}



	destinatarioID, erro := strconv.ParseUint(mux.Vars(r)["usuarioId"], 10, 64)

	if erro != nil || destinatarioID == 0 {

		respostas.Erro(w, http.StatusBadRequest, erro)

		return

	}



	if destinatarioID == meuID {

		respostas.Erro(w, http.StatusBadRequest, errors.New("não é possível enviar mensagem para si mesmo"))

		return

	}



	corpo, erro := io.ReadAll(r.Body)

	if erro != nil {

		respostas.Erro(w, http.StatusUnprocessableEntity, erro)

		return

	}



	var req modelos.EnviarMensagemRequest

	if erro = json.Unmarshal(corpo, &req); erro != nil {

		respostas.Erro(w, http.StatusBadRequest, erro)

		return

	}

	if erro = req.Preparar(); erro != nil {

		respostas.Erro(w, http.StatusBadRequest, erro)

		return

	}



	if req.RespostaAID != nil && *req.RespostaAID > 0 {

		db, erro := banco.Conectar()

		if erro != nil {

			respostas.Erro(w, http.StatusInternalServerError, erro)

			return

		}

		defer db.Close()



		repo := repositorios.NovoRepositorioDeMensagens(db)

		if _, erro = repo.BuscarMensagemPorID(meuID, *req.RespostaAID); erro != nil {

			respostas.Erro(w, http.StatusBadRequest, errors.New("mensagem de resposta inválida"))

			return

		}

	}



	db, erro := banco.Conectar()

	if erro != nil {

		respostas.Erro(w, http.StatusInternalServerError, erro)

		return

	}

	defer db.Close()



	repoUsuarios := repositorios.NovoRepositorioDeUsuarios(db)

	if _, erro = repoUsuarios.BuscarPorID(destinatarioID); erro != nil {

		respostas.Erro(w, http.StatusNotFound, erro)

		return

	}



	repo := repositorios.NovoRepositorioDeMensagens(db)

	mensagem, erro := repo.Enviar(meuID, destinatarioID, req.Conteudo, req.AnexoURL, req.RespostaAID)

	if erro != nil {

		respostas.Erro(w, http.StatusInternalServerError, erro)

		return

	}

	servicos.BroadcastNovaMensagem(db, mensagem)

	respostas.JSON(w, http.StatusCreated, mensagem)

}



func ApagarConversaMensagens(w http.ResponseWriter, r *http.Request) {

	meuID, erro := auth.ExtrairUsuarioID(r)

	if erro != nil {

		respostas.Erro(w, http.StatusUnauthorized, erro)

		return

	}



	outroID, erro := strconv.ParseUint(mux.Vars(r)["outroId"], 10, 64)

	if erro != nil || outroID == 0 {

		respostas.Erro(w, http.StatusBadRequest, erro)

		return

	}



	db, erro := banco.Conectar()

	if erro != nil {

		respostas.Erro(w, http.StatusInternalServerError, erro)

		return

	}

	defer db.Close()



	repo := repositorios.NovoRepositorioDeMensagens(db)

	if erro = repo.ApagarConversa(meuID, outroID); erro != nil {

		respostas.Erro(w, http.StatusInternalServerError, erro)

		return

	}



	respostas.JSON(w, http.StatusOK, map[string]string{"mensagem": "Conversa apagada"})

}



func ApagarMensagem(w http.ResponseWriter, r *http.Request) {

	meuID, erro := auth.ExtrairUsuarioID(r)

	if erro != nil {

		respostas.Erro(w, http.StatusUnauthorized, erro)

		return

	}



	mensagemID, erro := strconv.ParseUint(mux.Vars(r)["id"], 10, 64)

	if erro != nil || mensagemID == 0 {

		respostas.Erro(w, http.StatusBadRequest, erro)

		return

	}



	db, erro := banco.Conectar()

	if erro != nil {

		respostas.Erro(w, http.StatusInternalServerError, erro)

		return

	}

	defer db.Close()



	repo := repositorios.NovoRepositorioDeMensagens(db)

	mensagem, erro := repo.ApagarMensagem(meuID, mensagemID)

	if erro != nil {

		if errors.Is(erro, sql.ErrNoRows) {

			respostas.Erro(w, http.StatusNotFound, errors.New("mensagem não encontrada"))

			return

		}

		respostas.Erro(w, http.StatusInternalServerError, erro)

		return

	}

	servicos.BroadcastMensagemApagada(
		mensagem.RemetenteID,
		mensagem.DestinatarioID,
		modelos.WsMensagemApagadaPayload{
			MensagemID:             mensagem.ID,
			RemetenteID:            mensagem.RemetenteID,
			DestinatarioID:         mensagem.DestinatarioID,
			ApagadoPorRemetente:    mensagem.ApagadoPorRemetente,
			ApagadoPorDestinatario: mensagem.ApagadoPorDestinatario,
			CriadoEm:               mensagem.CriadoEm.Format(time.RFC3339Nano),
		},
	)

	respostas.JSON(w, http.StatusOK, map[string]string{"mensagem": "Mensagem apagada"})

}



func EditarMensagem(w http.ResponseWriter, r *http.Request) {

	meuID, erro := auth.ExtrairUsuarioID(r)

	if erro != nil {

		respostas.Erro(w, http.StatusUnauthorized, erro)

		return

	}



	mensagemID, erro := strconv.ParseUint(mux.Vars(r)["id"], 10, 64)

	if erro != nil || mensagemID == 0 {

		respostas.Erro(w, http.StatusBadRequest, erro)

		return

	}



	corpo, erro := io.ReadAll(r.Body)

	if erro != nil {

		respostas.Erro(w, http.StatusUnprocessableEntity, erro)

		return

	}



	var req modelos.EditarMensagemRequest

	if erro = json.Unmarshal(corpo, &req); erro != nil {

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



	repo := repositorios.NovoRepositorioDeMensagens(db)

	mensagem, erro := repo.EditarMensagem(meuID, mensagemID, req.Conteudo)

	if erro != nil {

		if errors.Is(erro, sql.ErrNoRows) {

			respostas.Erro(w, http.StatusNotFound, errors.New("mensagem não encontrada"))

			return

		}

		respostas.Erro(w, http.StatusInternalServerError, erro)

		return

	}

	servicos.BroadcastMensagemAtualizada(
		[]uint64{mensagem.RemetenteID, mensagem.DestinatarioID},
		mensagem,
	)

	respostas.JSON(w, http.StatusOK, mensagem)

}



func ReagirMensagem(w http.ResponseWriter, r *http.Request) {

	meuID, erro := auth.ExtrairUsuarioID(r)

	if erro != nil {

		respostas.Erro(w, http.StatusUnauthorized, erro)

		return

	}



	mensagemID, erro := strconv.ParseUint(mux.Vars(r)["id"], 10, 64)

	if erro != nil || mensagemID == 0 {

		respostas.Erro(w, http.StatusBadRequest, erro)

		return

	}



	corpo, erro := io.ReadAll(r.Body)

	if erro != nil {

		respostas.Erro(w, http.StatusUnprocessableEntity, erro)

		return

	}



	var req modelos.ReagirMensagemRequest

	if erro = json.Unmarshal(corpo, &req); erro != nil {

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



	repo := repositorios.NovoRepositorioDeMensagens(db)

	mensagem, erro := repo.ReagirMensagem(meuID, mensagemID, req.Reacao)

	if erro != nil {

		if errors.Is(erro, sql.ErrNoRows) {

			respostas.Erro(w, http.StatusNotFound, errors.New("mensagem não encontrada"))

			return

		}

		respostas.Erro(w, http.StatusInternalServerError, erro)

		return

	}

	servicos.BroadcastMensagemAtualizada(
		[]uint64{mensagem.RemetenteID, mensagem.DestinatarioID},
		mensagem,
	)

	respostas.JSON(w, http.StatusOK, mensagem)

}



func ToggleFixarConversa(w http.ResponseWriter, r *http.Request) {

	meuID, erro := auth.ExtrairUsuarioID(r)

	if erro != nil {

		respostas.Erro(w, http.StatusUnauthorized, erro)

		return

	}



	outroID, erro := strconv.ParseUint(mux.Vars(r)["id"], 10, 64)

	if erro != nil || outroID == 0 {

		respostas.Erro(w, http.StatusBadRequest, erro)

		return

	}



	db, erro := banco.Conectar()

	if erro != nil {

		respostas.Erro(w, http.StatusInternalServerError, erro)

		return

	}

	defer db.Close()



	repo := repositorios.NovoRepositorioDeMensagens(db)

	fixada, erro := repo.ToggleFixarConversa(meuID, outroID)

	if erro != nil {

		respostas.Erro(w, http.StatusInternalServerError, erro)

		return

	}



	respostas.JSON(w, http.StatusOK, map[string]bool{"fixada": fixada})

}

func MarcarMensagemComoLida(w http.ResponseWriter, r *http.Request) {
	meuID, erro := auth.ExtrairUsuarioID(r)
	if erro != nil {
		respostas.Erro(w, http.StatusUnauthorized, erro)
		return
	}

	mensagemID, erro := strconv.ParseUint(mux.Vars(r)["id"], 10, 64)
	if erro != nil || mensagemID == 0 {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}

	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	repo := repositorios.NovoRepositorioDeMensagens(db)
	msg, erro := repo.BuscarMensagemPorID(meuID, mensagemID)
	if erro != nil {
		if errors.Is(erro, sql.ErrNoRows) {
			respostas.Erro(w, http.StatusNotFound, errors.New("mensagem não encontrada"))
			return
		}
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	if erro = repo.MarcarComoLida(meuID, mensagemID); erro != nil {
		if errors.Is(erro, sql.ErrNoRows) {
			respostas.Erro(w, http.StatusNotFound, errors.New("mensagem não encontrada"))
			return
		}
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	servicos.BroadcastConversaLida(db, meuID, msg.RemetenteID)

	respostas.NoContent(w)
}

