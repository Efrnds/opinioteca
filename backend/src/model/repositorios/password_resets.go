package repositorios

import (
	"database/sql"
	"time"
)

type PasswordReset struct {
	ID        uint64
	UsuarioID uint64
	CodeHash  string
	ExpiresAt time.Time
	UsedAt    *time.Time
	Attempts  int
	CreatedAt time.Time
}

type PasswordResets struct {
	db *sql.DB
}

func NovoRepositorioDePasswordResets(db *sql.DB) *PasswordResets {
	return &PasswordResets{db: db}
}

func (r *PasswordResets) InvalidarAnteriores(usuarioID uint64) error {
	_, erro := r.db.Exec(
		`UPDATE password_resets SET used_at = NOW()
		 WHERE usuario_id = $1 AND used_at IS NULL`,
		usuarioID,
	)
	return erro
}

func (r *PasswordResets) Criar(usuarioID uint64, codeHash string, expiresAt time.Time) (uint64, error) {
	var id uint64
	erro := r.db.QueryRow(
		`INSERT INTO password_resets (usuario_id, code_hash, expires_at)
		 VALUES ($1, $2, $3) RETURNING id`,
		usuarioID, codeHash, expiresAt,
	).Scan(&id)
	return id, erro
}

func (r *PasswordResets) BuscarAtivoPorUsuario(usuarioID uint64) (*PasswordReset, error) {
	linha := r.db.QueryRow(
		`SELECT id, usuario_id, code_hash, expires_at, used_at, attempts, created_at
		 FROM password_resets
		 WHERE usuario_id = $1 AND used_at IS NULL
		 ORDER BY created_at DESC
		 LIMIT 1`,
		usuarioID,
	)

	var reset PasswordReset
	var usedAt sql.NullTime
	erro := linha.Scan(
		&reset.ID, &reset.UsuarioID, &reset.CodeHash, &reset.ExpiresAt,
		&usedAt, &reset.Attempts, &reset.CreatedAt,
	)
	if erro == sql.ErrNoRows {
		return nil, nil
	}
	if erro != nil {
		return nil, erro
	}
	if usedAt.Valid {
		t := usedAt.Time
		reset.UsedAt = &t
	}
	return &reset, nil
}

func (r *PasswordResets) IncrementarTentativas(id uint64) error {
	_, erro := r.db.Exec(
		`UPDATE password_resets SET attempts = attempts + 1 WHERE id = $1`,
		id,
	)
	return erro
}

func (r *PasswordResets) MarcarUsado(id uint64) error {
	_, erro := r.db.Exec(
		`UPDATE password_resets SET used_at = NOW() WHERE id = $1`,
		id,
	)
	return erro
}
