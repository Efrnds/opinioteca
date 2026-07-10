package repositorios

import (
	"backend/src/modelos"
	"database/sql"
	"time"
)

type Configuracoes struct {
	db *sql.DB
}

func NovoRepositorioDeConfiguracoes(db *sql.DB) *Configuracoes {
	return &Configuracoes{db}
}

const colunasConfig = `
	usuario_id, ocultar_spoilers_padrao, mostrar_streak,
	notif_seguidor, notif_comentario, notif_votos, notif_mensagens,
	mensagem_de, streak_visivel_para, historico_visivel_para, visibilidade_perfil,
	tema, cor_destaque, cor_fundo_texto, cor_superficie, cor_texto, cor_hover,
	atualizado_em`

func scanConfig(scanner interface {
	Scan(dest ...any) error
}) (modelos.ConfiguracaoUsuario, error) {
	var c modelos.ConfiguracaoUsuario
	var fundo, superficie, texto, hover sql.NullString
	erro := scanner.Scan(
		&c.UsuarioID,
		&c.OcultarSpoilersPadrao,
		&c.MostrarStreak,
		&c.NotifSeguidor,
		&c.NotifComentario,
		&c.NotifVotos,
		&c.NotifMensagens,
		&c.MensagemDe,
		&c.StreakVisivelPara,
		&c.HistoricoVisivelPara,
		&c.VisibilidadePerfil,
		&c.Tema,
		&c.CorDestaque,
		&fundo,
		&superficie,
		&texto,
		&hover,
		&c.AtualizadoEm,
	)
	if erro != nil {
		return c, erro
	}
	if fundo.Valid && fundo.String != "" {
		v := fundo.String
		c.CorFundoTexto = &v
	}
	if superficie.Valid && superficie.String != "" {
		v := superficie.String
		c.CorSuperficie = &v
	}
	if texto.Valid && texto.String != "" {
		v := texto.String
		c.CorTexto = &v
	}
	if hover.Valid && hover.String != "" {
		v := hover.String
		c.CorHover = &v
	}
	if c.Tema == "" {
		c.Tema = modelos.TemaClaro
	}
	if c.CorDestaque == "" {
		c.CorDestaque = modelos.CorDestaquePadrao
	}
	return c, nil
}

func (repositorio Configuracoes) CriarPadrao(usuarioID uint64) error {
	_, erro := repositorio.db.Exec(
		`INSERT INTO usuario_configuracoes (usuario_id) VALUES ($1)
		 ON CONFLICT (usuario_id) DO NOTHING`,
		usuarioID,
	)
	return erro
}

// BuscarOuCriar retorna a config do usuário; cria defaults se não existir.
func (repositorio Configuracoes) BuscarOuCriar(usuarioID uint64) (modelos.ConfiguracaoUsuario, error) {
	linha := repositorio.db.QueryRow(
		`SELECT `+colunasConfig+` FROM usuario_configuracoes WHERE usuario_id = $1`,
		usuarioID,
	)
	c, erro := scanConfig(linha)
	if erro == nil {
		return c, nil
	}
	if erro != sql.ErrNoRows {
		return modelos.ConfiguracaoUsuario{}, erro
	}

	if erro = repositorio.CriarPadrao(usuarioID); erro != nil {
		return modelos.ConfiguracaoUsuario{}, erro
	}

	linha = repositorio.db.QueryRow(
		`SELECT `+colunasConfig+` FROM usuario_configuracoes WHERE usuario_id = $1`,
		usuarioID,
	)
	return scanConfig(linha)
}

func nullableHex(p *string) any {
	if p == nil || *p == "" {
		return nil
	}
	return *p
}

func (repositorio Configuracoes) Atualizar(usuarioID uint64, c modelos.ConfiguracaoUsuario) error {
	_, erro := repositorio.db.Exec(
		`UPDATE usuario_configuracoes SET
			ocultar_spoilers_padrao = $1,
			mostrar_streak = $2,
			notif_seguidor = $3,
			notif_comentario = $4,
			notif_votos = $5,
			notif_mensagens = $6,
			mensagem_de = $7,
			streak_visivel_para = $8,
			historico_visivel_para = $9,
			visibilidade_perfil = $10,
			tema = $11,
			cor_destaque = $12,
			cor_fundo_texto = $13,
			cor_superficie = $14,
			cor_texto = $15,
			cor_hover = $16,
			atualizado_em = $17
		 WHERE usuario_id = $18`,
		c.OcultarSpoilersPadrao,
		c.MostrarStreak,
		c.NotifSeguidor,
		c.NotifComentario,
		c.NotifVotos,
		c.NotifMensagens,
		c.MensagemDe,
		c.StreakVisivelPara,
		c.HistoricoVisivelPara,
		c.VisibilidadePerfil,
		c.Tema,
		c.CorDestaque,
		nullableHex(c.CorFundoTexto),
		nullableHex(c.CorSuperficie),
		nullableHex(c.CorTexto),
		nullableHex(c.CorHover),
		time.Now(),
		usuarioID,
	)
	return erro
}

// NotificacaoPermitida retorna se o destinatário aceita o tipo (sistema sempre true).
func (repositorio Configuracoes) NotificacaoPermitida(usuarioID uint64, tipo string) bool {
	switch tipo {
	case "advertencia", "conta_inativada", "denuncia_resolvida":
		return true
	}

	c, erro := repositorio.BuscarOuCriar(usuarioID)
	if erro != nil {
		return true
	}

	switch tipo {
	case "seguidor":
		return c.NotifSeguidor
	case "comentario":
		return c.NotifComentario
	case "voto_avaliacao":
		return c.NotifVotos
	case "mensagem":
		return c.NotifMensagens
	default:
		return true
	}
}
