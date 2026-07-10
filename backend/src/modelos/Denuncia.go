package modelos

import (
	"errors"
	"strings"
	"time"
)

const (
	TipoEntidadeAvaliacao  = "avaliacao"
	TipoEntidadeComentario = "comentario"
	TipoEntidadeUsuario    = "usuario"
	TipoEntidadeMensagem   = "mensagem"
)

type Denuncia struct {
	ID            uint64     `json:"id"`
	DenuncianteID uint64     `json:"denunciante_id"`
	TipoEntidade  string     `json:"tipo_entidade"`
	ReferenciaID  uint64     `json:"referencia_id"`
	Motivo        string     `json:"motivo"`
	Descricao     *string    `json:"descricao,omitempty"`
	Status        string     `json:"status"`
	AdminID       *uint64    `json:"admin_id,omitempty"`
	Resolucao     *string    `json:"resolucao,omitempty"`
	CriadoEm      time.Time  `json:"criado_em"`
	ResolvidaEm   *time.Time `json:"resolvida_em,omitempty"`
}

type CriarDenunciaRequest struct {
	TipoEntidade string `json:"tipo_entidade"`
	ReferenciaID uint64 `json:"referencia_id"`
	Motivo       string `json:"motivo"`
	Descricao    string `json:"descricao"`
}

type ResolverDenunciaRequest struct {
	Acao      string `json:"acao"`
	Resolucao string `json:"resolucao"`
}

type DenunciaListItem struct {
	ID                   uint64    `json:"id"`
	TipoEntidade         string    `json:"tipo_entidade"`
	ReferenciaID         uint64    `json:"referencia_id"`
	Motivo               string    `json:"motivo"`
	Status               string    `json:"status"`
	CriadoEm             time.Time `json:"criado_em"`
	DenuncianteNick      string    `json:"denunciante_nick"`
	DenuncianteNome      string    `json:"denunciante_nome"`
	DenunciasContraUsuario int     `json:"denuncias_contra_usuario"`
	DenunciasProcedentes   int     `json:"denuncias_procedentes"`
}

type DenunciaListagemResposta struct {
	Itens     []DenunciaListItem `json:"itens"`
	Pendentes int                `json:"pendentes"`
	Total     int                `json:"total"`
	Pagina    int                `json:"pagina"`
	Limite    int                `json:"limite"`
}

type DenunciaDetalhe struct {
	Denuncia
	DenuncianteNick        string `json:"denunciante_nick"`
	DenuncianteNome        string `json:"denunciante_nome"`
	Contexto               any    `json:"contexto"`
	DenunciasContraUsuario int    `json:"denuncias_contra_usuario"`
	DenunciasProcedentes   int    `json:"denuncias_procedentes"`
}

type DenunciaContextoAvaliacao struct {
	ID        uint64 `json:"id"`
	Texto     string `json:"texto"`
	Nota      int    `json:"nota"`
	AutorID   uint64 `json:"autor_id"`
	AutorNick string `json:"autor_nick"`
	AutorNome string `json:"autor_nome"`
}

type DenunciaContextoComentario struct {
	ID           uint64 `json:"id"`
	Texto        string `json:"texto"`
	AvaliacaoID  uint64 `json:"avaliacao_id"`
	AutorID      uint64 `json:"autor_id"`
	AutorNick    string `json:"autor_nick"`
	AutorNome    string `json:"autor_nome"`
}

type DenunciaContextoUsuario struct {
	ID    uint64 `json:"id"`
	Nick  string `json:"nick"`
	Email string `json:"email"`
	Nome  string `json:"nome"`
}

type DenunciaContextoMensagem struct {
	ID             uint64    `json:"id"`
	Texto          string    `json:"texto"`
	RemetenteID    uint64    `json:"remetente_id"`
	RemetenteNick  string    `json:"remetente_nick"`
	RemetenteNome  string    `json:"remetente_nome"`
	CriadoEm       time.Time `json:"criado_em"`
}

var motivosDenunciaValidos = map[string]bool{
	"spam":                 true,
	"ofensivo":             true,
	"conteudo_inadequado":  true,
	"informacao_falsa":     true,
	"outro":                true,
}

var tiposEntidadeValidos = map[string]bool{
	TipoEntidadeAvaliacao:  true,
	TipoEntidadeComentario: true,
	TipoEntidadeUsuario:    true,
	TipoEntidadeMensagem:   true,
}

var acoesResolucaoValidas = map[string]bool{
	"rejeitar":          true,
	"remover_conteudo":  true,
	"advertir":          true,
	"inativar_usuario":  true,
}

func (req *CriarDenunciaRequest) Preparar() error {
	req.TipoEntidade = strings.TrimSpace(req.TipoEntidade)
	req.Motivo = strings.TrimSpace(req.Motivo)
	req.Descricao = strings.TrimSpace(req.Descricao)

	if !tiposEntidadeValidos[req.TipoEntidade] {
		return errors.New("tipo_entidade inválido")
	}
	if req.ReferenciaID == 0 {
		return errors.New("referencia_id é obrigatório")
	}
	if !motivosDenunciaValidos[req.Motivo] {
		return errors.New("motivo inválido")
	}
	if req.Motivo == "outro" && req.Descricao == "" {
		return errors.New("descrição é obrigatória quando o motivo é 'outro'")
	}
	return nil
}

func (req *ResolverDenunciaRequest) Preparar() error {
	req.Acao = strings.TrimSpace(req.Acao)
	req.Resolucao = strings.TrimSpace(req.Resolucao)

	if !acoesResolucaoValidas[req.Acao] {
		return errors.New("ação inválida")
	}
	if req.Acao == "advertir" && req.Resolucao == "" {
		return errors.New("informe a advertência em resolucao")
	}
	return nil
}
