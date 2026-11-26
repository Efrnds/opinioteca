package servicos

import (
	"backend/src/model/modelos"
	"backend/src/model/repositorios"
	"backend/src/utils/websockets"
	"database/sql"
)

// Depois da gravação, empurra NOVA_MENSAGEM para quem está online dos dois lados.
func BroadcastNovaMensagem(db *sql.DB, mensagem modelos.Mensagem) {
	repo := repositorios.NovoRepositorioDeMensagens(db)
	remetenteID := mensagem.RemetenteID
	destinatarioID := mensagem.DestinatarioID

	totalDest, _ := repo.ContarNaoLidasTotal(destinatarioID)
	convDest, _ := repo.ContarNaoLidasComUsuario(destinatarioID, remetenteID)
	websockets.EnviarParaUsuario(destinatarioID, "NOVA_MENSAGEM", modelos.WsNovaMensagemPayload{
		Mensagem:         mensagem,
		NaoLidasTotal:    totalDest,
		NaoLidasConversa: convDest,
	})

	totalRem, _ := repo.ContarNaoLidasTotal(remetenteID)
	websockets.EnviarParaUsuario(remetenteID, "NOVA_MENSAGEM", modelos.WsNovaMensagemPayload{
		Mensagem:         mensagem,
		NaoLidasTotal:    totalRem,
		NaoLidasConversa: 0,
	})
}

// BroadcastConversaLida: conversa lida.
func BroadcastConversaLida(db *sql.DB, meuID, outroID uint64) {
	repo := repositorios.NovoRepositorioDeMensagens(db)
	total, _ := repo.ContarNaoLidasTotal(meuID)
	conv, _ := repo.ContarNaoLidasComUsuario(meuID, outroID)
	websockets.EnviarParaUsuario(meuID, "CONVERSA_LIDA", modelos.WsConversaLidaPayload{
		UsuarioID:        outroID,
		NaoLidasTotal:    total,
		NaoLidasConversa: conv,
	})
}

// BroadcastMensagemAtualizada: mensagem atualizada.
func BroadcastMensagemAtualizada(usuarioIDs []uint64, mensagem modelos.Mensagem) {
	payload := modelos.WsMensagemAtualizadaPayload{Mensagem: mensagem}
	for _, id := range usuarioIDs {
		if id > 0 {
			websockets.EnviarParaUsuario(id, "MENSAGEM_ATUALIZADA", payload)
		}
	}
}

// BroadcastMensagemApagada: mensagem apagada.
func BroadcastMensagemApagada(remetenteID, destinatarioID uint64, payload modelos.WsMensagemApagadaPayload) {
	websockets.EnviarParaUsuario(remetenteID, "MENSAGEM_APAGADA", payload)
	websockets.EnviarParaUsuario(destinatarioID, "MENSAGEM_APAGADA", payload)
}
