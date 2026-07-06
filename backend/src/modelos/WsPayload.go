package modelos

type WsNovaMensagemPayload struct {
	Mensagem         Mensagem `json:"mensagem"`
	NaoLidasTotal    int      `json:"nao_lidas_total"`
	NaoLidasConversa int      `json:"nao_lidas_conversa"`
}

type WsConversaLidaPayload struct {
	UsuarioID        uint64 `json:"usuario_id"`
	NaoLidasTotal    int    `json:"nao_lidas_total"`
	NaoLidasConversa int    `json:"nao_lidas_conversa"`
}

type WsMensagemAtualizadaPayload struct {
	Mensagem Mensagem `json:"mensagem"`
}

type WsMensagemApagadaPayload struct {
	MensagemID             uint64 `json:"mensagem_id"`
	RemetenteID            uint64 `json:"remetente_id"`
	DestinatarioID         uint64 `json:"destinatario_id"`
	ApagadoPorRemetente    bool   `json:"apagado_por_remetente"`
	ApagadoPorDestinatario bool   `json:"apagado_por_destinatario"`
	CriadoEm               string `json:"criado_em,omitempty"`
}
