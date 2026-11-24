package pdf

import (
	"bytes"
	"testing"
)

func TestGeraPDFBasico(t *testing.T) {
	doc := Novo(Meta{
		Titulo:      "Relatório de teste",
		Descricao:   "Descrição com acentuação: usuários e avaliações.",
		Filtros:     []string{"Status: todos"},
		NomeArquivo: "teste.pdf",
	})
	doc.Secao("Resumo")
	doc.ResumoLinha("Total", "10")
	doc.Tabela([]float64{45, 45, 45, 47}, []string{"Col1", "Col2", "Col3", "Col4"}, [][]string{
		{"alpha", "beta", "gama", "delta"},
	})
	var buf bytes.Buffer
	if err := doc.pdf.Output(&buf); err != nil {
		t.Fatal(err)
	}
	if buf.Len() < 500 {
		t.Fatalf("PDF muito pequeno: %d", buf.Len())
	}
	if !bytes.HasPrefix(buf.Bytes(), []byte("%PDF")) {
		t.Fatal("não é PDF")
	}
}
