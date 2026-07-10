package repositorios

import (
	"backend/src/modelos"
	"database/sql"
	"fmt"
	"strconv"
	"strings"
	"sync"
	"time"
)

const colunasUsuarioBase = `id, nome, nick, email, image_url, rank_confiabilidade, assinatura_id, is_admin, sequencia_atual, maior_sequencia, modo_zen, status, criadoEm`

var (
	schemaInativadoOnce sync.Once
	schemaTemInativado   bool

	schemaAssinaturaExpiraOnce sync.Once
	schemaTemAssinaturaExpira   bool

	schemaBannerOnce sync.Once
	schemaTemBanner  bool

	schemaBannerPosicaoOnce sync.Once
	schemaTemBannerPosicao  bool
)

// schemaTemInativadoEm detecta se a migration 20260708 já rodou (coluna inativado_em).
// Sem a coluna, login/listagens continuam funcionando; soft-delete/reativação exigem a migration.
func schemaTemInativadoEm(db *sql.DB) bool {
	schemaInativadoOnce.Do(func() {
		var existe bool
		erro := db.QueryRow(`
			SELECT EXISTS (
				SELECT 1
				FROM information_schema.columns
				WHERE table_schema = current_schema()
				  AND table_name = 'usuarios'
				  AND column_name = 'inativado_em'
			)`).Scan(&existe)
		schemaTemInativado = erro == nil && existe
	})
	return schemaTemInativado
}

func schemaTemAssinaturaExpiraEm(db *sql.DB) bool {
	schemaAssinaturaExpiraOnce.Do(func() {
		var existe bool
		erro := db.QueryRow(`
			SELECT EXISTS (
				SELECT 1
				FROM information_schema.columns
				WHERE table_schema = current_schema()
				  AND table_name = 'usuarios'
				  AND column_name = 'assinatura_expira_em'
			)`).Scan(&existe)
		schemaTemAssinaturaExpira = erro == nil && existe
	})
	return schemaTemAssinaturaExpira
}

func schemaTemBannerUrl(db *sql.DB) bool {
	schemaBannerOnce.Do(func() {
		var existe bool
		erro := db.QueryRow(`
			SELECT EXISTS (
				SELECT 1
				FROM information_schema.columns
				WHERE table_schema = current_schema()
				  AND table_name = 'usuarios'
				  AND column_name = 'banner_url'
			)`).Scan(&existe)
		schemaTemBanner = erro == nil && existe
	})
	return schemaTemBanner
}

func schemaTemBannerPosicaoCol(db *sql.DB) bool {
	schemaBannerPosicaoOnce.Do(func() {
		var existe bool
		erro := db.QueryRow(`
			SELECT EXISTS (
				SELECT 1
				FROM information_schema.columns
				WHERE table_schema = current_schema()
				  AND table_name = 'usuarios'
				  AND column_name = 'banner_posicao'
			)`).Scan(&existe)
		schemaTemBannerPosicao = erro == nil && existe
	})
	return schemaTemBannerPosicao
}

func colunasUsuario(db *sql.DB) string {
	cols := colunasUsuarioBase
	if schemaTemAssinaturaExpiraEm(db) {
		cols += ", assinatura_expira_em"
	}
	if schemaTemInativadoEm(db) {
		cols += ", inativado_em"
	}
	if schemaTemBannerUrl(db) {
		cols += ", banner_url"
	}
	if schemaTemBannerPosicaoCol(db) {
		cols += ", banner_posicao"
	}
	return cols
}

func scanUsuario(linhas *sql.Rows, usuario *modelos.Usuario, db *sql.DB) error {
	var image sql.NullString
	destinos := []any{
		&usuario.ID,
		&usuario.Nome,
		&usuario.Nick,
		&usuario.Email,
		&image,
		&usuario.RankConfiabilidade,
		&usuario.AssinaturaID,
		&usuario.IsAdmin,
		&usuario.SequenciaAtual,
		&usuario.MaiorSequencia,
		&usuario.ModoZen,
		&usuario.Status,
		&usuario.CriadoEm,
	}
	comAssinaturaExpira := schemaTemAssinaturaExpiraEm(db)
	comInativado := schemaTemInativadoEm(db)
	comBanner := schemaTemBannerUrl(db)
	comBannerPosicao := schemaTemBannerPosicaoCol(db)
	var assinaturaExpira sql.NullTime
	var inativadoEm sql.NullTime
	var banner sql.NullString
	var bannerPosicao sql.NullString
	if comAssinaturaExpira {
		destinos = append(destinos, &assinaturaExpira)
	}
	if comInativado {
		destinos = append(destinos, &inativadoEm)
	}
	if comBanner {
		destinos = append(destinos, &banner)
	}
	if comBannerPosicao {
		destinos = append(destinos, &bannerPosicao)
	}
	if erro := linhas.Scan(destinos...); erro != nil {
		return erro
	}
	if image.Valid {
		usuario.Image = image.String
	}
	if comAssinaturaExpira && assinaturaExpira.Valid && modelos.TempoJSONSeguro(assinaturaExpira.Time) {
		t := assinaturaExpira.Time
		usuario.AssinaturaExpiraEm = &t
	}
	if comInativado && inativadoEm.Valid && modelos.TempoJSONSeguro(inativadoEm.Time) {
		t := inativadoEm.Time
		usuario.InativadoEm = &t
	}
	if comBanner && banner.Valid {
		usuario.Banner = banner.String
	}
	if comBannerPosicao && bannerPosicao.Valid {
		usuario.BannerPosicao = bannerPosicao.String
	}
	return nil
}

// AtualizarModoZen persiste a preferência de modo zen do usuário.
func (repositorio Usuarios) AtualizarModoZen(usuarioID uint64, modoZen bool) error {
	_, erro := repositorio.db.Exec(
		`UPDATE usuarios SET modo_zen = $1 WHERE id = $2`,
		modoZen, usuarioID,
	)
	return erro
}

// Usuarios é a struct responsável por representar o repositório de usuários.
type Usuarios struct {
	db *sql.DB
}

// NovoRepositorioDeUsuarios é a função responsável por criar um novo repositório de usuários.
func NovoRepositorioDeUsuarios(db *sql.DB) *Usuarios {
	return &Usuarios{db}
}

func (repositorio Usuarios) Criar(usuario modelos.Usuario) (uint64, error) {
	var id uint64

	erro := repositorio.db.QueryRow(
		"INSERT INTO usuarios (nome, nick, email, senha, status, image_url) VALUES ($1, $2, $3, $4, $5, NULLIF($6, '')) RETURNING id",
		usuario.Nome,
		usuario.Nick,
		usuario.Email,
		usuario.Senha,
		"ativo",
		usuario.Image,
	).Scan(&id)
	if erro != nil {
		return 0, erro
	}

	_ = NovoRepositorioDeConfiguracoes(repositorio.db).CriarPadrao(id)

	return uint64(id), nil
}

// Buscar tras todos os usuários que correspondem ao nome ou nick fornecido, retornando uma lista de usuários e um erro, se houver.
func (repositorio Usuarios) Buscar(nomeOuNick string) ([]modelos.Usuario, error) {
	nomeOuNick = fmt.Sprintf("%%%s%%", nomeOuNick)

	linhas, erro := repositorio.db.Query(
		fmt.Sprintf("SELECT %s FROM usuarios WHERE (nome ILIKE $1 OR nick ILIKE $1) AND status = 'ativo'", colunasUsuario(repositorio.db)),
		nomeOuNick)
	if erro != nil {
		return nil, erro
	}
	defer linhas.Close()

	usuarios := make([]modelos.Usuario, 0)
	for linhas.Next() {
		var usuario modelos.Usuario
		if erro = scanUsuario(linhas, &usuario, repositorio.db); erro != nil {
			return nil, erro
		}

		usuarios = append(usuarios, usuario)
	}

	return usuarios, nil
}

// FiltrosAdminUsuarios controla busca e paginação da listagem admin.
type FiltrosAdminUsuarios struct {
	Query            string
	AssinaturaFiltro string
	Limite           int
	Offset           int
}

func (repositorio Usuarios) clausulaAssinaturaFiltro(filtro string) string {
	if filtro == "" {
		return ""
	}

	comExpira := schemaTemAssinaturaExpiraEm(repositorio.db)
	pago := "assinatura_id IN (2, 3)"
	ativoPago := pago
	if comExpira {
		ativoPago = pago + " AND (assinatura_expira_em IS NULL OR assinatura_expira_em > NOW())"
	}

	switch filtro {
	case "ativas":
		return " AND " + ativoPago
	case "opiniotop":
		if comExpira {
			return " AND assinatura_id = 2 AND (assinatura_expira_em IS NULL OR assinatura_expira_em > NOW())"
		}
		return " AND assinatura_id = 2"
	case "opiniopro":
		if comExpira {
			return " AND assinatura_id = 3 AND (assinatura_expira_em IS NULL OR assinatura_expira_em > NOW())"
		}
		return " AND assinatura_id = 3"
	case "expirando":
		if !comExpira {
			return " AND FALSE"
		}
		return " AND assinatura_id IN (2, 3) AND assinatura_expira_em IS NOT NULL AND assinatura_expira_em > NOW() AND assinatura_expira_em <= NOW() + INTERVAL '30 days'"
	case "expiradas":
		if !comExpira {
			return " AND FALSE"
		}
		return " AND assinatura_id IN (2, 3) AND assinatura_expira_em IS NOT NULL AND assinatura_expira_em <= NOW()"
	case "todas":
		return " AND " + pago
	default:
		return ""
	}
}

func (repositorio Usuarios) whereAdminUsuarios(filtros FiltrosAdminUsuarios) (string, []interface{}) {
	where := " WHERE 1=1"
	args := make([]interface{}, 0)

	if termo := strings.TrimSpace(filtros.Query); termo != "" {
		padrao := "%" + termo + "%"
		where += fmt.Sprintf(" AND (nome ILIKE $%d OR nick ILIKE $%d OR email ILIKE $%d)", len(args)+1, len(args)+1, len(args)+1)
		args = append(args, padrao)
	}

	where += repositorio.clausulaAssinaturaFiltro(filtros.AssinaturaFiltro)
	return where, args
}

// BuscarTodos retorna todos os usuários (ativos e inativos) para o painel admin.
func (repositorio Usuarios) BuscarTodos() ([]modelos.Usuario, error) {
	usuarios, _, erro := repositorio.BuscarAdmin(FiltrosAdminUsuarios{Limite: 100000, Offset: 0})
	return usuarios, erro
}

// BuscarAdmin lista usuários com filtros e paginação para o painel admin.
func (repositorio Usuarios) BuscarAdmin(filtros FiltrosAdminUsuarios) ([]modelos.Usuario, int, error) {
	limite := filtros.Limite
	if limite <= 0 {
		limite = 20
	}
	offset := filtros.Offset
	if offset < 0 {
		offset = 0
	}

	where, args := repositorio.whereAdminUsuarios(filtros)

	var total int
	if erro := repositorio.db.QueryRow("SELECT COUNT(*) FROM usuarios"+where, args...).Scan(&total); erro != nil {
		return nil, 0, erro
	}

	query := fmt.Sprintf(
		"SELECT %s FROM usuarios%s ORDER BY id LIMIT $%d OFFSET $%d",
		colunasUsuario(repositorio.db),
		where,
		len(args)+1,
		len(args)+2,
	)
	args = append(args, limite, offset)

	linhas, erro := repositorio.db.Query(query, args...)
	if erro != nil {
		return nil, 0, erro
	}
	defer linhas.Close()

	usuarios := make([]modelos.Usuario, 0)
	for linhas.Next() {
		var usuario modelos.Usuario
		if erro = scanUsuario(linhas, &usuario, repositorio.db); erro != nil {
			return nil, 0, erro
		}
		usuarios = append(usuarios, usuario)
	}

	return usuarios, total, nil
}

// ContarStatsAssinaturas retorna contadores do painel de assinaturas.
func (repositorio Usuarios) ContarStatsAssinaturas() (modelos.AssinaturaStatsAdmin, error) {
	var stats modelos.AssinaturaStatsAdmin
	if !schemaTemAssinaturaExpiraEm(repositorio.db) {
		erro := repositorio.db.QueryRow(`
			SELECT
				COUNT(*) FILTER (WHERE assinatura_id = 2),
				COUNT(*) FILTER (WHERE assinatura_id = 3),
				0,
				COUNT(*) FILTER (WHERE assinatura_id IN (2, 3))
			FROM usuarios
		`).Scan(&stats.Top, &stats.Pro, &stats.Expirando, &stats.TotalAtivas)
		return stats, erro
	}

	erro := repositorio.db.QueryRow(`
		SELECT
			COUNT(*) FILTER (WHERE assinatura_id = 2 AND (assinatura_expira_em IS NULL OR assinatura_expira_em > NOW())),
			COUNT(*) FILTER (WHERE assinatura_id = 3 AND (assinatura_expira_em IS NULL OR assinatura_expira_em > NOW())),
			COUNT(*) FILTER (
				WHERE assinatura_id IN (2, 3)
				  AND assinatura_expira_em IS NOT NULL
				  AND assinatura_expira_em > NOW()
				  AND assinatura_expira_em <= NOW() + INTERVAL '30 days'
			),
			COUNT(*) FILTER (WHERE assinatura_id IN (2, 3) AND (assinatura_expira_em IS NULL OR assinatura_expira_em > NOW()))
		FROM usuarios
	`).Scan(&stats.Top, &stats.Pro, &stats.Expirando, &stats.TotalAtivas)
	return stats, erro
}

// BuscarPorID trás um usuário específico do banco de dados, com base no ID fornecido, retornando o usuário e um erro, se houver.
func (repositorio Usuarios) BuscarPorID(usuarioID uint64) (modelos.Usuario, error) {
	linhas, erro := repositorio.db.Query(
		fmt.Sprintf("SELECT %s FROM usuarios WHERE id = $1", colunasUsuario(repositorio.db)),
		usuarioID)
	if erro != nil {
		return modelos.Usuario{}, erro
	}
	defer linhas.Close()

	var usuario modelos.Usuario
	if linhas.Next() {
		if erro = scanUsuario(linhas, &usuario, repositorio.db); erro != nil {
			return modelos.Usuario{}, erro
		}
	}

	return usuario, nil
}

// BuscarPorNick busca um usuário pelo nick (case insensitive).
func (repositorio Usuarios) BuscarPorNick(nick string) (modelos.Usuario, error) {
	linhas, erro := repositorio.db.Query(
		fmt.Sprintf("SELECT %s FROM usuarios WHERE LOWER(nick) = LOWER($1)", colunasUsuario(repositorio.db)),
		nick,
	)
	if erro != nil {
		return modelos.Usuario{}, erro
	}
	defer linhas.Close()

	var usuario modelos.Usuario
	if linhas.Next() {
		if erro = scanUsuario(linhas, &usuario, repositorio.db); erro != nil {
			return modelos.Usuario{}, erro
		}
	}

	return usuario, nil
}

// BuscarPorNickParaLogin retorna credenciais do usuário pelo nick (case insensitive).
func (repositorio Usuarios) BuscarPorNickParaLogin(nick string) (modelos.Usuario, error) {
	comInativado := schemaTemInativadoEm(repositorio.db)
	query := "SELECT id, senha, status, is_admin FROM usuarios WHERE LOWER(nick) = LOWER($1)"
	if comInativado {
		query = "SELECT id, senha, status, is_admin, inativado_em FROM usuarios WHERE LOWER(nick) = LOWER($1)"
	}
	linha, erro := repositorio.db.Query(query, nick)
	if erro != nil {
		return modelos.Usuario{}, erro
	}
	defer linha.Close()

	var usuario modelos.Usuario
	var inativadoEm sql.NullTime
	if linha.Next() {
		destinos := []any{
			&usuario.ID,
			&usuario.Senha,
			&usuario.Status,
			&usuario.IsAdmin,
		}
		if comInativado {
			destinos = append(destinos, &inativadoEm)
		}
		if erro = linha.Scan(destinos...); erro != nil {
			return modelos.Usuario{}, erro
		}
		if comInativado && inativadoEm.Valid && modelos.TempoJSONSeguro(inativadoEm.Time) {
			t := inativadoEm.Time
			usuario.InativadoEm = &t
		}
	}

	return usuario, nil
}

// Atualizar é a função responsável por atualizar um usuário específico no banco de dados, com base no ID fornecido, retornando um erro, se houver.
func (repositorio Usuarios) Atualizar(usuarioID uint64, usuario modelos.Usuario) error {
	query := "UPDATE usuarios SET nome = $1, nick = $2, email = $3, image_url = NULLIF($4, '') WHERE id = $5"
	args := []any{usuario.Nome, usuario.Nick, usuario.Email, usuario.Image, usuarioID}
	comBanner := schemaTemBannerUrl(repositorio.db)
	comBannerPosicao := schemaTemBannerPosicaoCol(repositorio.db)
	if comBanner && comBannerPosicao {
		// Campos de banner vazios preservam o valor atual (outros PUTs não enviam o campo).
		query = "UPDATE usuarios SET nome = $1, nick = $2, email = $3, image_url = NULLIF($4, ''), banner_url = COALESCE(NULLIF($5, ''), banner_url), banner_posicao = COALESCE(NULLIF($6, ''), banner_posicao) WHERE id = $7"
		args = []any{usuario.Nome, usuario.Nick, usuario.Email, usuario.Image, usuario.Banner, usuario.BannerPosicao, usuarioID}
	} else if comBanner {
		query = "UPDATE usuarios SET nome = $1, nick = $2, email = $3, image_url = NULLIF($4, ''), banner_url = COALESCE(NULLIF($5, ''), banner_url) WHERE id = $6"
		args = []any{usuario.Nome, usuario.Nick, usuario.Email, usuario.Image, usuario.Banner, usuarioID}
	}

	statement, erro := repositorio.db.Prepare(query)
	if erro != nil {
		return erro
	}
	defer statement.Close()

	if _, erro = statement.Exec(args...); erro != nil {
		return erro
	}

	return nil
}

// AtualizarAdmin atualiza perfil, status e flag de admin (painel administrativo).
func (repositorio Usuarios) AtualizarAdmin(usuarioID uint64, usuario modelos.Usuario) error {
	query := "UPDATE usuarios SET nome = $1, nick = $2, email = $3, image_url = NULLIF($4, ''), status = $5, is_admin = $6 WHERE id = $7"
	args := []any{usuario.Nome, usuario.Nick, usuario.Email, usuario.Image, usuario.Status, usuario.IsAdmin, usuarioID}
	comBanner := schemaTemBannerUrl(repositorio.db)
	comBannerPosicao := schemaTemBannerPosicaoCol(repositorio.db)
	if comBanner && comBannerPosicao {
		query = "UPDATE usuarios SET nome = $1, nick = $2, email = $3, image_url = NULLIF($4, ''), banner_url = COALESCE(NULLIF($5, ''), banner_url), banner_posicao = COALESCE(NULLIF($6, ''), banner_posicao), status = $7, is_admin = $8 WHERE id = $9"
		args = []any{usuario.Nome, usuario.Nick, usuario.Email, usuario.Image, usuario.Banner, usuario.BannerPosicao, usuario.Status, usuario.IsAdmin, usuarioID}
	} else if comBanner {
		query = "UPDATE usuarios SET nome = $1, nick = $2, email = $3, image_url = NULLIF($4, ''), banner_url = COALESCE(NULLIF($5, ''), banner_url), status = $6, is_admin = $7 WHERE id = $8"
		args = []any{usuario.Nome, usuario.Nick, usuario.Email, usuario.Image, usuario.Banner, usuario.Status, usuario.IsAdmin, usuarioID}
	}

	statement, erro := repositorio.db.Prepare(query)
	if erro != nil {
		return erro
	}
	defer statement.Close()

	if _, erro = statement.Exec(args...); erro != nil {
		return erro
	}

	return nil
}

// CriarAdmin cadastra usuário com opção de definir is_admin.
func (repositorio Usuarios) CriarAdmin(usuario modelos.Usuario, isAdmin bool) (uint64, error) {
	var id uint64

	erro := repositorio.db.QueryRow(
		"INSERT INTO usuarios (nome, nick, email, senha, status, image_url, is_admin) VALUES ($1, $2, $3, $4, $5, NULLIF($6, ''), $7) RETURNING id",
		usuario.Nome,
		usuario.Nick,
		usuario.Email,
		usuario.Senha,
		"ativo",
		usuario.Image,
		isAdmin,
	).Scan(&id)
	if erro != nil {
		return 0, erro
	}

	_ = NovoRepositorioDeConfiguracoes(repositorio.db).CriarPadrao(id)

	return id, nil
}

// Inativar soft-delete: status inativo + timestamp para janela de reativação.
func (repositorio Usuarios) Inativar(usuarioID uint64) error {
	if !schemaTemInativadoEm(repositorio.db) {
		return fmt.Errorf("migration pendente: execute backend/sql/migrations/20260708_producao.sql")
	}
	_, erro := repositorio.db.Exec(
		"UPDATE usuarios SET status = 'inativo', inativado_em = NOW() WHERE id = $1",
		usuarioID,
	)
	return erro
}

// Reativar restaura conta se ainda dentro da janela de 30 dias.
func (repositorio Usuarios) Reativar(usuarioID uint64) error {
	if !schemaTemInativadoEm(repositorio.db) {
		return fmt.Errorf("migration pendente: execute backend/sql/migrations/20260708_producao.sql")
	}
	resultado, erro := repositorio.db.Exec(
		`UPDATE usuarios
		 SET status = 'ativo', inativado_em = NULL
		 WHERE id = $1
		   AND status = 'inativo'
		   AND inativado_em IS NOT NULL
		   AND inativado_em + INTERVAL '30 days' >= NOW()`,
		usuarioID,
	)
	if erro != nil {
		return erro
	}
	afetadas, erro := resultado.RowsAffected()
	if erro != nil {
		return erro
	}
	if afetadas == 0 {
		return fmt.Errorf("fora do prazo de reativação ou conta já ativa")
	}
	return nil
}

// PodeReativar indica se a conta inativa ainda está na janela de 30 dias.
func (repositorio Usuarios) PodeReativar(usuario modelos.Usuario) bool {
	if usuario.Status != "inativo" || usuario.InativadoEm == nil {
		return false
	}
	limite := usuario.InativadoEm.AddDate(0, 0, modelos.DiasReativacaoConta)
	return !time.Now().After(limite)
}

// Segue verifica se seguidorID segue seguidoID.
func (repositorio Usuarios) Segue(seguidorID, seguidoID uint64) (bool, error) {
	if seguidorID == 0 || seguidoID == 0 || seguidorID == seguidoID {
		return false, nil
	}
	var existe bool
	erro := repositorio.db.QueryRow(
		`SELECT EXISTS(
			SELECT 1 FROM seguidores WHERE id_seguidor = $1 AND id_seguido = $2
		)`,
		seguidorID, seguidoID,
	).Scan(&existe)
	return existe, erro
}

// BuscarPorEmail é a função responsável por buscar um usuário específico do banco de dados, com base no email fornecido, retornando o usuário e um erro, se houver.
func (repositorio Usuarios) BuscarPorEmail(email string) (modelos.Usuario, error) {
	linha, erro := repositorio.db.Query(
		"SELECT id, senha, status, is_admin FROM usuarios WHERE email = $1",
		email)
	if erro != nil {
		return modelos.Usuario{}, erro
	}
	defer linha.Close()

	var usuario modelos.Usuario

	if linha.Next() {
		if erro = linha.Scan(
			&usuario.ID,
			&usuario.Senha,
			&usuario.Status,
			&usuario.IsAdmin,
		); erro != nil {
			return modelos.Usuario{}, erro
		}
	}

	return usuario, nil
}

// Seguir é a função responsável por permitir que um usuário siga outro usuário, com base nos IDs fornecidos, retornando um erro, se houver.
func (repositorio Usuarios) Seguir(IDSeguido, IDSeguidor uint64) error {
	statement, erro := repositorio.db.Prepare(
		"INSERT INTO seguidores (id_seguido, id_seguidor) VALUES ($1,$2) ON CONFLICT (id_seguido, id_seguidor) DO NOTHING",
	)
	if erro != nil {
		return erro
	}
	defer statement.Close()

	if _, erro = statement.Exec(IDSeguido, IDSeguidor); erro != nil {
		return erro
	}

	return nil
}

// DeixarSeguir é a função responsável por permitir que um usuário pare de seguir outro usuário, com base nos IDs fornecidos, retornando um erro, se houver.
func (repositorio Usuarios) DeixarSeguir(IDSeguido, IDSeguidor uint64) error {
	statement, erro := repositorio.db.Prepare(
		"DELETE FROM seguidores WHERE id_seguido = $1 AND id_seguidor = $2",
	)
	if erro != nil {
		return erro
	}
	defer statement.Close()

	if _, erro = statement.Exec(IDSeguido, IDSeguidor); erro != nil {
		return erro
	}

	return nil
}

// BuscarSeguidores é a função responsável por buscar os seguidores de um usuário específico do banco de dados, com base no ID fornecido, retornando uma lista de usuários e um erro, se houver.
func (repositorio Usuarios) BuscarSeguidores(IDSeguido uint64) ([]modelos.Usuario, error) {
	linhas, erro := repositorio.db.Query(
		`SELECT u.id, u.nome, u.nick, u.image_url, u.rank_confiabilidade, u.sequencia_atual, u.assinatura_id, u.assinatura_expira_em, u.status
		FROM usuarios u
		INNER JOIN seguidores s ON u.id = s.id_seguidor
		WHERE s.id_seguido = $1 AND u.status = 'ativo'
		`,
		IDSeguido)
	if erro != nil {
		return nil, erro
	}
	defer linhas.Close()

	var usuarios []modelos.Usuario
	for linhas.Next() {
		var usuario modelos.Usuario
		var image sql.NullString
		var assinaturaExpira sql.NullTime
		if erro = linhas.Scan(
			&usuario.ID,
			&usuario.Nome,
			&usuario.Nick,
			&image,
			&usuario.RankConfiabilidade,
			&usuario.SequenciaAtual,
			&usuario.AssinaturaID,
			&assinaturaExpira,
			&usuario.Status,
		); erro != nil {
			return nil, erro
		}
		if image.Valid {
			usuario.Image = image.String
		}
		if assinaturaExpira.Valid {
			t := assinaturaExpira.Time
			usuario.AssinaturaExpiraEm = &t
		}
		usuarios = append(usuarios, usuario)
	}

	return usuarios, nil
}

// BuscarSeguindo é a função responsável por buscar os usuários que um usuário específico está seguindo, com base no ID fornecido, retornando uma lista de usuários e um erro, se houver.
func (repositorio Usuarios) BuscarSeguindo(IDSeguido uint64) ([]modelos.Usuario, error) {
	linhas, erro := repositorio.db.Query(
		`SELECT u.id, u.nome, u.nick, u.image_url, u.rank_confiabilidade, u.sequencia_atual, u.assinatura_id, u.assinatura_expira_em, u.status
		FROM usuarios u
		INNER JOIN seguidores s ON u.id = s.id_seguido
		WHERE s.id_seguidor = $1 AND u.status = 'ativo'
		`,
		IDSeguido)
	if erro != nil {
		return nil, erro
	}
	defer linhas.Close()

	var usuarios []modelos.Usuario
	for linhas.Next() {
		var usuario modelos.Usuario
		var image sql.NullString
		var assinaturaExpira sql.NullTime
		if erro = linhas.Scan(
			&usuario.ID,
			&usuario.Nome,
			&usuario.Nick,
			&image,
			&usuario.RankConfiabilidade,
			&usuario.SequenciaAtual,
			&usuario.AssinaturaID,
			&assinaturaExpira,
			&usuario.Status,
		); erro != nil {
			return nil, erro
		}
		if image.Valid {
			usuario.Image = image.String
		}
		if assinaturaExpira.Valid {
			t := assinaturaExpira.Time
			usuario.AssinaturaExpiraEm = &t
		}
		usuarios = append(usuarios, usuario)
	}

	return usuarios, nil
}

// BuscarSenha é a função responsável por buscar a senha de um usuário específico no banco de dados, com base no ID fornecido, retornando a senha e um erro, se houver.
func (repositorio Usuarios) BuscarSenha(usuarioID uint64) (string, error) {
	linha, erro := repositorio.db.Query(
		"SELECT senha FROM usuarios WHERE id = $1",
		usuarioID)
	if erro != nil {
		return "", erro
	}
	defer linha.Close()

	var usuario modelos.Usuario
	if linha.Next() {
		if erro = linha.Scan(
			&usuario.Senha,
		); erro != nil {
			return "", erro
		}
	}

	return usuario.Senha, nil
}

// AtualizarSenha é a função responsável por atualizar a senha de um usuário específico no banco de dados, com base no ID fornecido, retornando um erro, se houver.
func (repositorio Usuarios) AtualizarSenha(usuarioID uint64, senha string) error {
	statement, erro := repositorio.db.Prepare(
		"UPDATE usuarios SET senha = $1 WHERE id = $2",
	)
	if erro != nil {
		return erro
	}
	defer statement.Close()

	if _, erro = statement.Exec(senha, usuarioID); erro != nil {
		return erro
	}

	return nil
}

// IsAdmin é a função responsável por verificar se um usuário específico é um administrador, com base no ID fornecido, retornando um booleano e um erro, se houver.
func (repositorio Usuarios) IsAdmin(usuarioID uint64) (bool, error) {
	linha, erro := repositorio.db.Query(
		"SELECT is_admin FROM usuarios WHERE id = $1",
		usuarioID)
	if erro != nil {
		return false, erro
	}
	defer linha.Close()

	var usuario modelos.Usuario
	if linha.Next() {
		if erro = linha.Scan(
			&usuario.IsAdmin,
		); erro != nil {
			return false, erro
		}
	}
	return usuario.IsAdmin, nil
}

// AtualizarStatus é a função responsável por atualizar o status de um usuário específico no banco de dados, com base no ID fornecido, retornando um erro, se houver.
func (repositorio Usuarios) AtualizarStatus(usuarioID uint64, status string) error {
	statement, erro := repositorio.db.Prepare(
		"UPDATE usuarios SET status = $1 WHERE id = $2",
	)
	if erro != nil {
		return erro
	}
	defer statement.Close()
	if _, erro = statement.Exec(status, usuarioID); erro != nil {
		return erro
	}
	return nil
}

// AtualizarRank ajusta o rank de confiabilidade do autor dentro de uma transação.
func (repositorio Usuarios) AtualizarRank(tx *sql.Tx, usuarioID uint64, delta int) error {
	if delta == 0 {
		return nil
	}
	_, erro := tx.Exec(
		`UPDATE usuarios SET rank_confiabilidade = GREATEST(0, rank_confiabilidade + $1) WHERE id = $2`,
		delta, usuarioID,
	)
	return erro
}

// RecalcularRanksFromVotos sincroniza rank_confiabilidade com a soma dos votos nas avaliações.
// upvote = +1, downvote = -1, mínimo 0.
func (repositorio Usuarios) RecalcularRanksFromVotos() error {
	_, erro := repositorio.db.Exec(`
		UPDATE usuarios u
		SET rank_confiabilidade = GREATEST(0, COALESCE((
			SELECT SUM(CASE
				WHEN v.tipo_voto = 'upvote' THEN 1
				WHEN v.tipo_voto = 'downvote' THEN -1
				ELSE 0
			END)
			FROM voto_avaliacoes v
			INNER JOIN avaliacoes a ON a.id = v.avaliacao_id
			WHERE a.usuario_id = u.id
		), 0))
	`)
	return erro
}

func (repositorio Usuarios) AtualizarSequencia(tx *sql.Tx, usuarioID uint64, sequencia int) error {
	_, erro := tx.Exec(
		`UPDATE usuarios
		 SET sequencia_atual = $1,
		     maior_sequencia = GREATEST(maior_sequencia, $1)
		 WHERE id = $2`,
		sequencia,
		usuarioID,
	)
	return erro
}

func (repositorio Usuarios) PesquisarGlobal(termo string, limite int) ([]modelos.UsuarioPesquisa, error) {
	padrao := "%" + termo + "%"
	linhas, erro := repositorio.db.Query(
		`SELECT id, nome, nick, image_url FROM usuarios
		 WHERE (nome ILIKE $1 OR nick ILIKE $1) AND status = 'ativo'
		 LIMIT $2`,
		padrao, limite,
	)
	if erro != nil {
		return nil, erro
	}
	defer linhas.Close()

	resultado := make([]modelos.UsuarioPesquisa, 0)
	for linhas.Next() {
		var u modelos.UsuarioPesquisa
		var image sql.NullString
		if erro := linhas.Scan(&u.ID, &u.Nome, &u.Nick, &image); erro != nil {
			return nil, erro
		}
		if image.Valid {
			u.Image = image.String
		}
		resultado = append(resultado, u)
	}
	return resultado, nil
}

// BuscarPorNickEmailOuID resolve um usuário por ID numérico, e-mail ou nick (admin).
func (repositorio Usuarios) BuscarPorNickEmailOuID(consulta string) (modelos.Usuario, error) {
	consulta = strings.TrimSpace(consulta)
	if consulta == "" {
		return modelos.Usuario{}, fmt.Errorf("consulta vazia")
	}

	if id, erro := strconv.ParseUint(consulta, 10, 64); erro == nil {
		return repositorio.BuscarPorID(id)
	}

	linhas, erro := repositorio.db.Query(
		fmt.Sprintf("SELECT %s FROM usuarios WHERE LOWER(email) = LOWER($1)", colunasUsuario(repositorio.db)),
		consulta,
	)
	if erro != nil {
		return modelos.Usuario{}, erro
	}
	defer linhas.Close()

	var usuario modelos.Usuario
	if linhas.Next() {
		if erro = scanUsuario(linhas, &usuario, repositorio.db); erro != nil {
			return modelos.Usuario{}, erro
		}
		return usuario, nil
	}

	return repositorio.BuscarPorNick(consulta)
}
