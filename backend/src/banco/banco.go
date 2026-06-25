package banco

import (
	"backend/src/config"
	"database/sql"

	_ "github.com/jackc/pgx/v5/stdlib"
)

func garantirSchemaComentarios(db *sql.DB) error {
	comandos := []string{
		`ALTER TABLE comentarios
		 ADD COLUMN IF NOT EXISTS pai_id INTEGER`,
		`ALTER TABLE comentarios
		 ADD COLUMN IF NOT EXISTS anexo_url VARCHAR(512)`,
		`ALTER TABLE avaliacoes
		 ADD COLUMN IF NOT EXISTS contem_spoiler BOOLEAN NOT NULL DEFAULT FALSE`,
		`ALTER TABLE avaliacoes
		 ADD COLUMN IF NOT EXISTS anexo_url VARCHAR(512)`,
		`CREATE TABLE IF NOT EXISTS voto_comentarios (
			id SERIAL PRIMARY KEY,
			usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
			comentario_id INTEGER NOT NULL REFERENCES comentarios(id) ON DELETE CASCADE,
			tipo_voto VARCHAR(50) NOT NULL CHECK (tipo_voto IN ('upvote', 'downvote')),
			criadoEm TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			UNIQUE (usuario_id, comentario_id)
		)`,
		`CREATE TABLE IF NOT EXISTS comentario_destaque_cache (
			avaliacao_id INTEGER PRIMARY KEY REFERENCES avaliacoes(id) ON DELETE CASCADE,
			comentario_id INTEGER REFERENCES comentarios(id) ON DELETE CASCADE,
			votos INTEGER NOT NULL DEFAULT 0,
			atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
		)`,
	}

	for _, comando := range comandos {
		if _, erro := db.Exec(comando); erro != nil {
			return erro
		}
	}

	return nil
}

func garantirSchemaMensagens(db *sql.DB) error {
	comandos := []string{
		`ALTER TABLE mensagens ADD COLUMN IF NOT EXISTS anexo_url VARCHAR(512)`,
		`ALTER TABLE mensagens ADD COLUMN IF NOT EXISTS editada BOOLEAN DEFAULT FALSE`,
		`ALTER TABLE mensagens ADD COLUMN IF NOT EXISTS resposta_a_id INTEGER REFERENCES mensagens(id) ON DELETE SET NULL`,
		`ALTER TABLE mensagens ADD COLUMN IF NOT EXISTS reacao VARCHAR(50)`,
		`ALTER TABLE mensagens ADD COLUMN IF NOT EXISTS apagado_por_remetente BOOLEAN DEFAULT FALSE`,
		`ALTER TABLE mensagens ADD COLUMN IF NOT EXISTS apagado_por_destinatario BOOLEAN DEFAULT FALSE`,
		`CREATE TABLE IF NOT EXISTS conversas_fixadas (
			usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
			outro_usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
			UNIQUE(usuario_id, outro_usuario_id)
		)`,
	}

	for _, comando := range comandos {
		if _, erro := db.Exec(comando); erro != nil {
			return erro
		}
	}

	return nil
}

func garantirSchemaCitacoes(db *sql.DB) error {
	if _, erro := db.Exec(`CREATE TABLE IF NOT EXISTS citacoes (
		id SERIAL PRIMARY KEY,
		texto TEXT NOT NULL,
		autor VARCHAR(100) NOT NULL
	)`); erro != nil {
		return erro
	}

	var total int
	if erro := db.QueryRow(`SELECT COUNT(*) FROM citacoes`).Scan(&total); erro != nil {
		return erro
	}
	if total > 0 {
		return nil
	}

	_, erro := db.Exec(`INSERT INTO citacoes (texto, autor) VALUES
		('A vida não é um conto de fadas, mas também não é um pesadelo sem fim.', 'Machado de Assis'),
		('Minha alma é um arquivo de notícias velhas.', 'Clarice Lispector'),
		('O homem é um animal que caminha no escuro.', 'Guimarães Rosa'),
		('O amor é uma coisa que a gente nunca sabe como vai dar.', 'Jorge Amado'),
		('A inteligência quase sempre paga um preço muito alto.', 'Monteiro Lobato'),
		('Eu sou um ser humano e nada do que é humano me é estranho.', 'Cecília Meireles'),
		('Ser feliz sem motivo é a mais autêntica forma de felicidade.', 'Carlos Drummond de Andrade'),
		('A vida é um sopro.', 'Graciliano Ramos'),
		('A vida é uma comédia para quem pensa e uma tragédia para quem sente.', 'Lima Barreto'),
		('Quem canta seus males espanta.', 'José de Alencar'),
		('Deus escreve certo por linhas tortas.', 'Machado de Assis'),
		('A felicidade é uma borboleta que, quando perseguida, sempre está além do nosso alcance.', 'Machado de Assis'),
		('Liberdade é pouco. O que eu desejo ainda não tem nome.', 'Clarice Lispector'),
		('A solidão é uma coisa que se aprende.', 'Clarice Lispector'),
		('O sertão é onde o homem se refaz.', 'Guimarães Rosa'),
		('O sertão é o mesmo em todo lugar.', 'Guimarães Rosa'),
		('O amor é uma palavra bonita, mas é uma coisa difícil de explicar.', 'Jorge Amado'),
		('A terra é redonda, mas o sertão é quadrado.', 'Guimarães Rosa'),
		('A vida é uma peça de teatro que não permite ensaios.', 'Machado de Assis'),
		('Não sou nada. Nunca serei nada. Não posso querer ser nada.', 'Álvares de Azevedo'),
		('A poesia está no chão, esperando ser escrita.', 'Carlos Drummond de Andrade'),
		('O tempo é um rio que leva tudo embora.', 'Machado de Assis'),
		('A literatura é a prova de que a vida não basta.', 'Clarice Lispector'),
		('O homem nasce bom, a sociedade o corrompe.', 'Monteiro Lobato'),
		('A vida é uma sucessão de momentos que se perdem no instante em que começam.', 'Machado de Assis'),
		('O Brasil é o país do futuro, e sempre será.', 'Stefan Zweig'),
		('A palavra é o instrumento do pensamento.', 'Cecília Meireles'),
		('O destino não é uma questão de sorte, é uma questão de escolha.', 'Machado de Assis'),
		('O silêncio é uma forma de música.', 'Clarice Lispector')`)
	return erro
}

// Conectar abre uma conexão com o banco de dados e retorna a instância do sql.DB
func Conectar() (*sql.DB, error) {
	db, erro := sql.Open("pgx", config.StringConexaoBanco)
	if erro != nil {
		return nil, erro
	}

	if erro = db.Ping(); erro != nil {
		db.Close()
		return nil, erro
	}

	if erro = garantirSchemaComentarios(db); erro != nil {
		db.Close()
		return nil, erro
	}

	if erro = garantirSchemaMensagens(db); erro != nil {
		db.Close()
		return nil, erro
	}

	if erro = garantirSchemaCitacoes(db); erro != nil {
		db.Close()
		return nil, erro
	}

	return db, nil
}
