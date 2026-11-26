package servicos

import (
	"backend/src/model/modelos"
	"backend/src/model/repositorios"
	"backend/src/utils/websockets"
	"database/sql"
)

// DispararNotificacao: notificacao nas notificações.
func DispararNotificacao(db *sql.DB, destinatarioID, autorID uint64, tipo, titulo, conteudo string, referenciaID *uint64) {
	if destinatarioID == 0 || destinatarioID == autorID {
		return
	}

	if !repositorios.NovoRepositorioDeConfiguracoes(db).NotificacaoPermitida(destinatarioID, tipo) {
		return
	}

	criarEEnviarNotificacao(db, destinatarioID, tipo, titulo, conteudo, referenciaID)
}

// DispararNotificacaoSistema: notificacao sistema nas notificações.
func DispararNotificacaoSistema(db *sql.DB, destinatarioID uint64, tipo, titulo, conteudo string, referenciaID *uint64) {
	if destinatarioID == 0 {
		return
	}

	criarEEnviarNotificacao(db, destinatarioID, tipo, titulo, conteudo, referenciaID)
}

// Cria e enviar notificacao nas notificações.
func criarEEnviarNotificacao(db *sql.DB, destinatarioID uint64, tipo, titulo, conteudo string, referenciaID *uint64) {
	repo := repositorios.NovoRepositorioDeNotificacoes(db)
	notificacao, erro := repo.Criar(modelos.Notificacao{
		UsuarioID:       destinatarioID,
		TipoNotificacao: tipo,
		Titulo:          titulo,
		Conteudo:        conteudo,
		ReferenciaID:    referenciaID,
	})
	if erro != nil {
		return
	}

	websockets.EnviarParaUsuario(destinatarioID, "NOVA_NOTIFICACAO", notificacao)
}
