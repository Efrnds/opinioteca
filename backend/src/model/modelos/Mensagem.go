package modelos

import (
	"errors"
	"strings"
	"time"
)

type MensagemResumo struct {
	ID          uint64  `json:"id"`
	RemetenteID uint64  `json:"remetente_id"`
	Conteudo    string  `json:"conteudo"`
	AnexoURL    *string `json:"anexo_url,omitempty"`
}

type Mensagem struct {
	ID                      uint64          `json:"id"`
	RemetenteID             uint64          `json:"remetente_id"`
	DestinatarioID          uint64          `json:"destinatario_id"`
	Conteudo                string          `json:"conteudo"`
	AnexoURL                *string         `json:"anexo_url,omitempty"`
	Lida                    bool            `json:"lida"`
	Editada                 bool            `json:"editada"`
	RespostaAID             *uint64         `json:"resposta_a_id,omitempty"`
	Reacao                  *string         `json:"reacao,omitempty"`
	ApagadoPorRemetente     bool            `json:"apagado_por_remetente"`
	ApagadoPorDestinatario  bool            `json:"apagado_por_destinatario"`
	RespostaA               *MensagemResumo `json:"resposta_a,omitempty"`
	CriadoEm                time.Time       `json:"criado_em"`
}

type ConversaResumo struct {
	UsuarioID        uint64    `json:"usuario_id"`
	Nome             string    `json:"nome"`
	Nick             string    `json:"nick"`
	Image            string    `json:"image,omitempty"`
	UltimaMensagem   string    `json:"ultima_mensagem"`
	UltimaMensagemEm time.Time `json:"ultima_mensagem_em"`
	EnviadaPorMim    bool      `json:"enviada_por_mim"`
	Fixada           bool      `json:"fixada"`
	NaoLidas         int       `json:"nao_lidas"`
}

type EnviarMensagemRequest struct {
	Conteudo     string `json:"conteudo"`
	AnexoURL     string `json:"anexo_url"`
	RespostaAID  *uint64 `json:"resposta_a_id"`
}

type EditarMensagemRequest struct {
	Conteudo string `json:"conteudo"`
}

type ReagirMensagemRequest struct {
	Reacao string `json:"reacao"`
}

func (req *EnviarMensagemRequest) Preparar() error {
	req.Conteudo = strings.TrimSpace(req.Conteudo)
	req.AnexoURL = strings.TrimSpace(req.AnexoURL)
	if req.Conteudo == "" && req.AnexoURL == "" {
		return errors.New("Informe o texto ou um anexo")
	}
	if req.Conteudo != "" && textoContemLink(req.Conteudo) {
		return errors.New("Links não são permitidos em mensagens")
	}
	if erro := ValidarURLAnexo(req.AnexoURL); erro != nil {
		return erro
	}
	return nil
}

func (req *EditarMensagemRequest) Preparar() error {
	req.Conteudo = strings.TrimSpace(req.Conteudo)
	if req.Conteudo == "" {
		return errors.New("O conteúdo não pode ser vazio")
	}
	if textoContemLink(req.Conteudo) {
		return errors.New("Links não são permitidos em mensagens")
	}
	return nil
}

func (req *ReagirMensagemRequest) Preparar() error {
	req.Reacao = strings.TrimSpace(req.Reacao)
	if req.Reacao == "" {
		return errors.New("Informe uma reação")
	}
	return nil
}
