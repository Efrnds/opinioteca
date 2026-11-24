package pdf

import (
	"bytes"
	_ "embed"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/jung-kurt/gofpdf"
)

//go:embed logo.png
var logoPNG []byte

// Meta descreve o cabeçalho padrão de um relatório PDF.
type Meta struct {
	Titulo      string
	Descricao   string
	Filtros     []string
	NomeArquivo string
}

// Documento encapsula um PDF de relatório Opinioteca.
type Documento struct {
	pdf        *gofpdf.Fpdf
	tr         func(string) string
	meta       Meta
	logoPronto bool
	pagina     int
}

// Novo cria um documento A4 com cabeçalho (logo, título, descrição, filtros, data).
func Novo(meta Meta) *Documento {
	p := gofpdf.New("P", "mm", "A4", "")
	tr := p.UnicodeTranslatorFromDescriptor("")
	d := &Documento{pdf: p, tr: tr, meta: meta}
	p.SetMargins(14, 14, 14)
	p.SetAutoPageBreak(true, 18)
	p.SetHeaderFuncMode(func() {
		d.pagina++
		if d.pagina == 1 {
			d.desenharCabecalhoCompleto()
			return
		}
		d.desenharCabecalhoSimples()
	}, false)
	p.SetFooterFunc(func() {
		p.SetY(-12)
		p.SetFont("Helvetica", "I", 8)
		p.SetTextColor(120, 120, 120)
		p.CellFormat(0, 6, tr(fmt.Sprintf("Opinioteca - página %d", p.PageNo())), "", 0, "C", false, 0, "")
	})
	p.AddPage()
	return d
}

func (d *Documento) garantirLogo() {
	if d.logoPronto {
		return
	}
	d.pdf.RegisterImageOptionsReader("logo", gofpdf.ImageOptions{ImageType: "PNG"}, bytes.NewReader(logoPNG))
	d.logoPronto = true
}

func (d *Documento) desenharCabecalhoSimples() {
	p := d.pdf
	d.garantirLogo()
	p.ImageOptions("logo", 14, 8, 9, 0, false, gofpdf.ImageOptions{ImageType: "PNG"}, 0, "")
	p.SetXY(25, 9)
	p.SetFont("Helvetica", "B", 10)
	p.SetTextColor(27, 36, 50)
	p.Cell(0, 5, d.tr("Opinioteca - "+d.meta.Titulo+" (cont.)"))
	p.SetDrawColor(27, 36, 50)
	p.SetLineWidth(0.3)
	p.Line(14, 18, 196, 18)
	p.SetY(22)
}

func (d *Documento) desenharCabecalhoCompleto() {
	p := d.pdf
	d.garantirLogo()
	p.ImageOptions("logo", 14, 8, 11, 0, false, gofpdf.ImageOptions{ImageType: "PNG"}, 0, "")

	p.SetXY(28, 9)
	p.SetFont("Helvetica", "B", 13)
	p.SetTextColor(27, 36, 50)
	p.Cell(0, 5, d.tr("Opinioteca"))

	p.SetXY(28, 14)
	p.SetFont("Helvetica", "", 8)
	p.SetTextColor(100, 100, 100)
	gerado := time.Now().In(time.FixedZone("BRT", -3*3600)).Format("02/01/2006 15:04")
	p.Cell(0, 4, d.tr("Gerado em "+gerado))

	p.SetDrawColor(27, 36, 50)
	p.SetLineWidth(0.4)
	p.Line(14, 20, 196, 20)

	p.SetY(23)
	p.SetFont("Helvetica", "B", 15)
	p.SetTextColor(27, 36, 50)
	p.MultiCell(0, 7, d.tr(d.meta.Titulo), "", "L", false)

	p.SetFont("Helvetica", "", 10)
	p.SetTextColor(70, 70, 70)
	p.MultiCell(0, 5, d.tr(d.meta.Descricao), "", "L", false)
	p.Ln(1)

	if len(d.meta.Filtros) > 0 {
		p.SetFont("Helvetica", "B", 9)
		p.SetTextColor(27, 36, 50)
		p.Cell(0, 5, d.tr("Filtros aplicados:"))
		p.Ln(5)
		p.SetFont("Helvetica", "", 9)
		p.SetTextColor(70, 70, 70)
		for _, f := range d.meta.Filtros {
			if strings.TrimSpace(f) == "" {
				continue
			}
			p.Cell(0, 4.5, d.tr("- "+f))
			p.Ln(4.5)
		}
		p.Ln(1)
	}

	p.SetDrawColor(220, 220, 220)
	p.SetLineWidth(0.2)
	y := p.GetY()
	p.Line(14, y, 196, y)
	p.Ln(4)
}

// Secao adiciona um subtítulo de seção.
func (d *Documento) Secao(titulo string) {
	d.pdf.SetFont("Helvetica", "B", 12)
	d.pdf.SetTextColor(27, 36, 50)
	d.pdf.Cell(0, 7, d.tr(titulo))
	d.pdf.Ln(8)
}

// Paragrafo escreve texto corrido.
func (d *Documento) Paragrafo(texto string) {
	d.pdf.SetFont("Helvetica", "", 10)
	d.pdf.SetTextColor(50, 50, 50)
	d.pdf.MultiCell(0, 5, d.tr(texto), "", "L", false)
	d.pdf.Ln(2)
}

// ResumoLinha escreve um par rótulo/valor.
func (d *Documento) ResumoLinha(rotulo, valor string) {
	d.pdf.SetFont("Helvetica", "", 10)
	d.pdf.SetTextColor(70, 70, 70)
	d.pdf.Cell(70, 5.5, d.tr(rotulo))
	d.pdf.SetFont("Helvetica", "B", 10)
	d.pdf.SetTextColor(27, 36, 50)
	d.pdf.Cell(0, 5.5, d.tr(valor))
	d.pdf.Ln(5.5)
}

// Tabela renderiza uma tabela simples com cabeçalho e linhas.
func (d *Documento) Tabela(larguras []float64, cabecalhos []string, linhas [][]string) {
	p := d.pdf
	altura := 6.0

	desenharCabecalho := func() {
		p.SetFont("Helvetica", "B", 8)
		p.SetFillColor(27, 36, 50)
		p.SetTextColor(255, 255, 255)
		for i, h := range cabecalhos {
			p.CellFormat(larguras[i], altura, d.tr(h), "1", 0, "L", true, 0, "")
		}
		p.Ln(-1)
	}

	desenharCabecalho()

	p.SetFont("Helvetica", "", 8)
	p.SetTextColor(40, 40, 40)
	fill := false
	for _, linha := range linhas {
		if p.GetY()+altura > 277 {
			p.AddPage()
			desenharCabecalho()
			p.SetFont("Helvetica", "", 8)
			p.SetTextColor(40, 40, 40)
		}
		if fill {
			p.SetFillColor(245, 247, 250)
		} else {
			p.SetFillColor(255, 255, 255)
		}
		for i, celula := range linha {
			texto := truncar(celula, int(larguras[i]*1.6))
			p.CellFormat(larguras[i], altura, d.tr(texto), "1", 0, "L", true, 0, "")
		}
		p.Ln(-1)
		fill = !fill
	}
	p.Ln(3)
}

// Vazio informa que não há dados.
func (d *Documento) Vazio(msg string) {
	d.pdf.SetFont("Helvetica", "I", 10)
	d.pdf.SetTextColor(120, 120, 120)
	d.pdf.Cell(0, 6, d.tr(msg))
	d.pdf.Ln(8)
}

// Escrever envia o PDF na resposta HTTP.
func (d *Documento) Escrever(w http.ResponseWriter) error {
	nome := d.meta.NomeArquivo
	if nome == "" {
		nome = "relatorio-opinioteca.pdf"
	}
	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, nome))
	return d.pdf.Output(w)
}

func truncar(s string, max int) string {
	s = strings.ReplaceAll(s, "\n", " ")
	s = strings.TrimSpace(s)
	if max <= 0 || len(s) <= max {
		return s
	}
	if max <= 3 {
		return s[:max]
	}
	return s[:max-3] + "..."
}

// FormatData formata time para pt-BR curto.
func FormatData(t time.Time) string {
	if t.IsZero() {
		return "-"
	}
	return t.In(time.FixedZone("BRT", -3*3600)).Format("02/01/2006 15:04")
}

// FormatDataCurta formata só a data.
func FormatDataCurta(t time.Time) string {
	if t.IsZero() {
		return "-"
	}
	return t.In(time.FixedZone("BRT", -3*3600)).Format("02/01/2006")
}
