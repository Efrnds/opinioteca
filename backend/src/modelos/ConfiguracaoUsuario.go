package modelos

import (
	"errors"
	"regexp"
	"strings"
	"time"
)

const (
	PrivacidadeTodos      = "todos"
	PrivacidadeSeguidores = "seguidores"
	PrivacidadeNinguem    = "ninguem"
	VisibilidadePublico   = "publico"
	VisibilidadePrivado   = "privado"
	DiasReativacaoConta   = 30

	TemaClaro  = "claro"
	TemaEscuro = "escuro"
	TemaLeitor = "leitor"
	TemaCustom = "custom"

	CorDestaquePadrao = "azul"
)

var presetsCorDestaque = map[string]bool{
	"azul":    true,
	"verde":   true,
	"rosa":    true,
	"roxo":    true,
	"laranja": true,
	"amarelo": true,
}

var hexCorRegex = regexp.MustCompile(`(?i)^#[0-9a-f]{6}$`)

// ConfiguracaoUsuario preferências, notificações e privacidade 1:1 com usuarios.
type ConfiguracaoUsuario struct {
	UsuarioID uint64 `json:"usuarioId,omitempty"`

	OcultarSpoilersPadrao bool `json:"ocultarSpoilersPadrao"`
	MostrarStreak         bool `json:"mostrarStreak"`

	NotifSeguidor   bool `json:"notifSeguidor"`
	NotifComentario bool `json:"notifComentario"`
	NotifVotos      bool `json:"notifVotos"`
	NotifMensagens  bool `json:"notifMensagens"`

	MensagemDe           string `json:"mensagemDe"`
	StreakVisivelPara    string `json:"streakVisivelPara"`
	HistoricoVisivelPara string `json:"historicoVisivelPara"`
	VisibilidadePerfil   string `json:"visibilidadePerfil"`

	Tema          string  `json:"tema"`
	CorDestaque   string  `json:"corDestaque"`
	CorFundoTexto *string `json:"corFundoTexto"`
	CorSuperficie *string `json:"corSuperficie"`
	CorTexto      *string `json:"corTexto"`
	CorHover      *string `json:"corHover"`

	AtualizadoEm time.Time `json:"atualizadoEm,omitempty"`
}

func ConfiguracaoPadrao(usuarioID uint64) ConfiguracaoUsuario {
	return ConfiguracaoUsuario{
		UsuarioID:             usuarioID,
		OcultarSpoilersPadrao: true,
		MostrarStreak:         true,
		NotifSeguidor:         true,
		NotifComentario:       true,
		NotifVotos:            true,
		NotifMensagens:        true,
		MensagemDe:            PrivacidadeTodos,
		StreakVisivelPara:     PrivacidadeTodos,
		HistoricoVisivelPara:  PrivacidadeTodos,
		VisibilidadePerfil:    VisibilidadePublico,
		Tema:                  TemaClaro,
		CorDestaque:           CorDestaquePadrao,
	}
}

func nivelPrivacidadeValido(v string) bool {
	return v == PrivacidadeTodos || v == PrivacidadeSeguidores || v == PrivacidadeNinguem
}

func temaValido(v string) bool {
	return v == TemaClaro || v == TemaEscuro || v == TemaLeitor || v == TemaCustom
}

func CorHexValida(v string) bool {
	return hexCorRegex.MatchString(v)
}

func normalizarCorOpcional(p *string) (*string, error) {
	if p == nil {
		return nil, nil
	}
	v := strings.TrimSpace(*p)
	if v == "" {
		return nil, nil
	}
	if !CorHexValida(v) {
		return nil, errors.New("cor inválida: use #RRGGBB")
	}
	normalizada := strings.ToUpper(v)
	return &normalizada, nil
}

func (c *ConfiguracaoUsuario) Preparar(permiteCustomPro bool) error {
	if !nivelPrivacidadeValido(c.MensagemDe) {
		return errors.New("mensagemDe inválido: use todos, seguidores ou ninguem")
	}
	if !nivelPrivacidadeValido(c.StreakVisivelPara) {
		return errors.New("streakVisivelPara inválido: use todos, seguidores ou ninguem")
	}
	if !nivelPrivacidadeValido(c.HistoricoVisivelPara) {
		return errors.New("historicoVisivelPara inválido: use todos, seguidores ou ninguem")
	}
	if c.VisibilidadePerfil != VisibilidadePublico && c.VisibilidadePerfil != VisibilidadePrivado {
		return errors.New("visibilidadePerfil inválido: use publico ou privado")
	}

	if c.Tema == "" {
		c.Tema = TemaClaro
	}
	if !temaValido(c.Tema) {
		return errors.New("tema inválido: use claro, escuro, leitor ou custom")
	}
	if c.Tema == TemaCustom && !permiteCustomPro {
		c.Tema = TemaClaro
	}

	c.CorDestaque = strings.TrimSpace(c.CorDestaque)
	if c.CorDestaque == "" {
		c.CorDestaque = CorDestaquePadrao
	}
	if presetsCorDestaque[strings.ToLower(c.CorDestaque)] {
		c.CorDestaque = strings.ToLower(c.CorDestaque)
	} else if CorHexValida(c.CorDestaque) {
		if !permiteCustomPro {
			// Downgrade / free: não persiste hex; volta ao preset padrão.
			c.CorDestaque = CorDestaquePadrao
		} else {
			c.CorDestaque = strings.ToUpper(c.CorDestaque)
		}
	} else {
		return errors.New("corDestaque inválido: use um preset ou #RRGGBB")
	}

	fundo, erro := normalizarCorOpcional(c.CorFundoTexto)
	if erro != nil {
		return errors.New("corFundoTexto: " + erro.Error())
	}
	superficie, erro := normalizarCorOpcional(c.CorSuperficie)
	if erro != nil {
		return errors.New("corSuperficie: " + erro.Error())
	}
	texto, erro := normalizarCorOpcional(c.CorTexto)
	if erro != nil {
		return errors.New("corTexto: " + erro.Error())
	}
	hover, erro := normalizarCorOpcional(c.CorHover)
	if erro != nil {
		return errors.New("corHover: " + erro.Error())
	}

	if !permiteCustomPro {
		c.CorFundoTexto = nil
		c.CorSuperficie = nil
		c.CorTexto = nil
		c.CorHover = nil
	} else {
		c.CorFundoTexto = fundo
		c.CorSuperficie = superficie
		c.CorTexto = texto
		c.CorHover = hover
	}

	return nil
}

// SanitizarAparenciaSemPro remove campos Pro da resposta (não altera o banco).
func SanitizarAparenciaSemPro(c ConfiguracaoUsuario) ConfiguracaoUsuario {
	if c.Tema == TemaCustom {
		c.Tema = TemaClaro
	}
	if CorHexValida(c.CorDestaque) {
		c.CorDestaque = CorDestaquePadrao
	}
	c.CorFundoTexto = nil
	c.CorSuperficie = nil
	c.CorTexto = nil
	c.CorHover = nil
	return c
}

// PermiteAcesso avalia se o viewer pode ver/interagir segundo o nível de privacidade.
// viewerSegueOwner = true quando o viewer segue o dono do recurso.
func PermiteAcesso(nivel string, ehDono, viewerSegueOwner bool) bool {
	if ehDono {
		return true
	}
	switch nivel {
	case PrivacidadeTodos:
		return true
	case PrivacidadeSeguidores:
		return viewerSegueOwner
	case PrivacidadeNinguem:
		return false
	default:
		return true
	}
}

// ReativarContaRequest corpo de POST /usuarios/reativar.
type ReativarContaRequest struct {
	Nick  string `json:"nick"`
	Senha string `json:"senha"`
}

// PerfilPublicoResposta payload de perfil com flags de privacidade / conta apagada.
type PerfilPublicoResposta struct {
	ID                 uint64 `json:"id"`
	Nome               string `json:"nome,omitempty"`
	Nick               string `json:"nick"`
	Image              string `json:"image,omitempty"`
	RankConfiabilidade int    `json:"rankConfiabilidade,omitempty"`
	SequenciaAtual     int    `json:"sequenciaAtual,omitempty"`
	PerfilPrivado      bool   `json:"perfilPrivado,omitempty"`
	ContaApagada       bool   `json:"contaApagada,omitempty"`
	PodeMensagem       *bool  `json:"podeMensagem,omitempty"`
}
