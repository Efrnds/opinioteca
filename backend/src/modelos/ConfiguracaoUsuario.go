package modelos

import (
	"errors"
	"time"
)

const (
	PrivacidadeTodos       = "todos"
	PrivacidadeSeguidores  = "seguidores"
	PrivacidadeNinguem     = "ninguem"
	VisibilidadePublico    = "publico"
	VisibilidadePrivado    = "privado"
	DiasReativacaoConta    = 30
)

// ConfiguracaoUsuario preferências, notificações e privacidade 1:1 com usuarios.
type ConfiguracaoUsuario struct {
	UsuarioID uint64 `json:"usuarioId,omitempty"`

	OcultarSpoilersPadrao bool `json:"ocultarSpoilersPadrao"`
	MostrarStreak         bool `json:"mostrarStreak"`

	NotifSeguidor    bool `json:"notifSeguidor"`
	NotifComentario  bool `json:"notifComentario"`
	NotifVotos       bool `json:"notifVotos"`
	NotifMensagens   bool `json:"notifMensagens"`

	MensagemDe           string `json:"mensagemDe"`
	StreakVisivelPara    string `json:"streakVisivelPara"`
	HistoricoVisivelPara string `json:"historicoVisivelPara"`
	VisibilidadePerfil   string `json:"visibilidadePerfil"`

	AtualizadoEm time.Time `json:"atualizadoEm,omitempty"`
}

func ConfiguracaoPadrao(usuarioID uint64) ConfiguracaoUsuario {
	return ConfiguracaoUsuario{
		UsuarioID:            usuarioID,
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
	}
}

func nivelPrivacidadeValido(v string) bool {
	return v == PrivacidadeTodos || v == PrivacidadeSeguidores || v == PrivacidadeNinguem
}

func (c *ConfiguracaoUsuario) Preparar() error {
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
	return nil
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
