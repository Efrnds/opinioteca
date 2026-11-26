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

type Meta struct {
	Titulo      string
	Descricao   string
	Filtros     []string
	NomeArquivo string
}

type Documento struct {
	pdf        *gofpdf.Fpdf
	tr         func(string) string
	meta       Meta
	logoPronto bool
	pagina     int
}

// Novo: novo.
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

// garantirLogo: logo.
func (d *Documento) garantirLogo() {
	if d.logoPronto {
		return
	}
	d.pdf.RegisterImageOptionsReader("logo", gofpdf.ImageOptions{ImageType: "PNG"}, bytes.NewReader(logoPNG))
	d.logoPronto = true
}

// desenharCabecalhoSimples: cabecalho simples.
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

// desenharCabecalhoCompleto: cabecalho completo.
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

// Secao: secao.
func (d *Documento) Secao(titulo string) {
	d.pdf.SetFont("Helvetica", "B", 12)
	d.pdf.SetTextColor(27, 36, 50)
	d.pdf.Cell(0, 7, d.tr(titulo))
	d.pdf.Ln(8)
}

// Paragrafo: paragrafo.
func (d *Documento) Paragrafo(texto string) {
	d.pdf.SetFont("Helvetica", "", 10)
	d.pdf.SetTextColor(50, 50, 50)
	d.pdf.MultiCell(0, 5, d.tr(texto), "", "L", false)
	d.pdf.Ln(2)
}

// ResumoLinha: linha.
func (d *Documento) ResumoLinha(rotulo, valor string) {
	d.pdf.SetFont("Helvetica", "", 10)
	d.pdf.SetTextColor(70, 70, 70)
	d.pdf.Cell(70, 5.5, d.tr(rotulo))
	d.pdf.SetFont("Helvetica", "B", 10)
	d.pdf.SetTextColor(27, 36, 50)
	d.pdf.Cell(0, 5.5, d.tr(valor))
	d.pdf.Ln(5.5)
}

// Tabela: tabela.
func (d *Documento) Tabela(larguras []float64, cabecalhos []string, linhas [][]string) {
	p := d.pdf
	const linhaAltura = 4.5
	const paddingVert = 1.5

	desenharCabecalho := func() {
		p.SetFont("Helvetica", "B", 8)
		p.SetFillColor(27, 36, 50)
		p.SetTextColor(255, 255, 255)
		for i, h := range cabecalhos {
			p.CellFormat(larguras[i], 6, d.tr(h), "1", 0, "L", true, 0, "")
		}
		p.Ln(-1)
	}

	desenharCabecalho()

	fill := false
	for _, linha := range linhas {
		p.SetFont("Helvetica", "", 8)
		celulas := make([][]string, len(larguras))
		maxLinhas := 1
		for i := 0; i < len(larguras); i++ {
			texto := ""
			if i < len(linha) {
				texto = limparCelula(linha[i])
			}
			partes := quebrarTexto(p, d.tr, texto, larguras[i]-1.6)
			celulas[i] = partes
			if len(partes) > maxLinhas {
				maxLinhas = len(partes)
			}
		}
		altura := float64(maxLinhas)*linhaAltura + paddingVert*2

		if p.GetY()+altura > 277 {
			p.AddPage()
			desenharCabecalho()
			p.SetFont("Helvetica", "", 8)
		}

		if fill {
			p.SetFillColor(245, 247, 250)
		} else {
			p.SetFillColor(255, 255, 255)
		}

		x0, y0 := p.GetX(), p.GetY()
		x := x0
		for i := 0; i < len(larguras); i++ {
			p.Rect(x, y0, larguras[i], altura, "FD")
			p.SetTextColor(40, 40, 40)
			yLinha := y0 + paddingVert
			for _, parte := range celulas[i] {
				p.SetXY(x+0.8, yLinha)
				p.CellFormat(larguras[i]-1.6, linhaAltura, d.tr(parte), "", 0, "L", false, 0, "")
				yLinha += linhaAltura
			}
			x += larguras[i]
		}
		p.SetXY(x0, y0+altura)
		fill = !fill
	}
	p.Ln(3)
}

// Vazio: vazio.
func (d *Documento) Vazio(msg string) {
	d.pdf.SetFont("Helvetica", "I", 10)
	d.pdf.SetTextColor(120, 120, 120)
	d.pdf.Cell(0, 6, d.tr(msg))
	d.pdf.Ln(8)
}

// Escreve.
func (d *Documento) Escrever(w http.ResponseWriter) error {
	nome := d.meta.NomeArquivo
	if nome == "" {
		nome = "relatorio-opinioteca.pdf"
	}
	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, nome))
	return d.pdf.Output(w)
}

// Limpa celula.
func limparCelula(s string) string {
	s = strings.ReplaceAll(s, "\r\n", " ")
	s = strings.ReplaceAll(s, "\n", " ")
	s = strings.ReplaceAll(s, "\t", " ")
	return strings.TrimSpace(s)
}

// quebrarTexto: texto.
func quebrarTexto(p *gofpdf.Fpdf, tr func(string) string, texto string, largura float64) []string {
	texto = limparCelula(texto)
	if texto == "" {
		return []string{""}
	}
	if largura <= 1 {
		return []string{texto}
	}

	palavras := strings.Fields(texto)
	if len(palavras) == 0 {
		return []string{""}
	}

	var linhas []string
	atual := palavras[0]
	for _, palavra := range palavras[1:] {
		candidato := atual + " " + palavra
		if p.GetStringWidth(tr(candidato)) <= largura {
			atual = candidato
			continue
		}
		linhas = append(linhas, atual)
		atual = palavra
		for p.GetStringWidth(tr(atual)) > largura && len([]rune(atual)) > 1 {
			runes := []rune(atual)
			corte := len(runes) - 1
			for corte > 1 && p.GetStringWidth(tr(string(runes[:corte]))) > largura {
				corte--
			}
			linhas = append(linhas, string(runes[:corte]))
			atual = string(runes[corte:])
		}
	}
	if atual != "" {
		linhas = append(linhas, atual)
	}
	if len(linhas) == 0 {
		return []string{""}
	}
	return linhas
}

// FormatData: data.
func FormatData(t time.Time) string {
	if t.IsZero() {
		return "-"
	}
	return t.In(time.FixedZone("BRT", -3*3600)).Format("02/01/2006 15:04")
}

// FormatDataCurta: data curta.
func FormatDataCurta(t time.Time) string {
	if t.IsZero() {
		return "-"
	}
	return t.In(time.FixedZone("BRT", -3*3600)).Format("02/01/2006")
}
