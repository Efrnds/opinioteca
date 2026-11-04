package repositorios

import (
	"database/sql"
	"os"
	"reflect"
	"testing"

	_ "github.com/jackc/pgx/v5/stdlib"
)

func TestLivrosEmAltaAgrupaEdicoesAntesDoLimite(t *testing.T) {
	dsn := os.Getenv("OPINIOTECA_TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("defina OPINIOTECA_TEST_DATABASE_URL para executar com PostgreSQL")
	}
	db, err := sql.Open("pgx", dsn)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	db.SetMaxOpenConns(1)
	// As tabelas temporárias isolam os dados do teste e somem ao fechar a conexão.
	_, err = db.Exec(`
 CREATE TEMP TABLE livros (
  id BIGINT PRIMARY KEY, isbn TEXT, titulo TEXT NOT NULL, editora TEXT,
  categoria_id BIGINT DEFAULT 1, status TEXT DEFAULT 'ativo', paginas INT DEFAULT 200,
  autor TEXT NOT NULL, sinopse TEXT, capa_url TEXT, data_publicacao TIMESTAMP,
  google_volume_id TEXT, origem TEXT DEFAULT 'manual', criadoEm TIMESTAMP DEFAULT NOW()
 );
 CREATE TEMP TABLE avaliacoes (id BIGSERIAL PRIMARY KEY, livro_id BIGINT, criadoEm TIMESTAMP DEFAULT NOW());
 INSERT INTO livros (id, titulo, autor) VALUES
 (1, 'Verity', 'Colleen Hoover'), (2, '  VERITY  ', 'Colleen   Hoover'),
 (3, 'Pachinko', 'Min Jin Lee'), (4, 'Pachinko', 'Min Jin Lee'),
 (5, 'Intermezzo', 'Sally Rooney'), (6, 'Verity', 'Outro autor'),
 (7, 'Inativo', 'Autor'), (8, 'Antigo', 'Autor');
 UPDATE livros SET status = 'inativo' WHERE id = 7;
 INSERT INTO avaliacoes (livro_id) SELECT 1 FROM generate_series(1, 3);
 INSERT INTO avaliacoes (livro_id) SELECT 2 FROM generate_series(1, 2);
 INSERT INTO avaliacoes (livro_id) SELECT 3 FROM generate_series(1, 1);
 INSERT INTO avaliacoes (livro_id) SELECT 4 FROM generate_series(1, 2);
 INSERT INTO avaliacoes (livro_id) SELECT 5 FROM generate_series(1, 4);
 INSERT INTO avaliacoes (livro_id) SELECT 7 FROM generate_series(1, 20);
 INSERT INTO avaliacoes (livro_id, criadoEm) SELECT 8, NOW() - INTERVAL '31 days' FROM generate_series(1, 30);
 `)
	if err != nil {
		t.Fatal(err)
	}
	repo := NovoRepositorioDeDescoberta(db)
	for _, caso := range []struct {
		nome   string
		limite int
		ids    []uint64
	}{
		{"soma popularidade e aplica limite apos agrupar", 3, []uint64{1, 5, 4}},
		{"preserva homonimos e ignora inativos e avaliacoes antigas", 50, []uint64{1, 5, 4, 8, 6}},
	} {
		t.Run(caso.nome, func(t *testing.T) {
			livros, err := repo.LivrosEmAlta(caso.limite)
			if err != nil {
				t.Fatal(err)
			}
			ids := make([]uint64, len(livros))
			for i, livro := range livros {
				ids[i] = livro.ID
			}
			if !reflect.DeepEqual(ids, caso.ids) {
				t.Fatalf("IDs = %v, esperado %v", ids, caso.ids)
			}
		})
	}
}
