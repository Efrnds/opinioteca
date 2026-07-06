package modelos

import "time"

type Notificacao struct {
	ID              uint64    `json:"id"`
	UsuarioID       uint64    `json:"usuario_id"`
	TipoNotificacao string    `json:"tipo_notificacao"`
	Titulo          string    `json:"titulo"`
	Conteudo        string    `json:"conteudo"`
	ReferenciaID    *uint64   `json:"referencia_id,omitempty"`
	Lida            bool      `json:"lida"`
	CriadoEm        time.Time `json:"criado_em"`
}
