package googlebooks

import (
	"reflect"
	"testing"
)

func TestMontarQueriesBusca(t *testing.T) {
	casos := []struct {
		nome string
		q    string
		want []string
	}{
		{nome: "vazio", q: "  ", want: nil},
		{
			nome: "sobrenome unico",
			q:    "marx",
			want: []string{"marx", "intitle:marx", "inauthor:marx"},
		},
		{
			nome: "kant",
			q:    "kant",
			want: []string{"kant", "intitle:kant", "inauthor:kant"},
		},
		{
			nome: "nome completo",
			q:    "karl marx",
			want: []string{"karl marx", `intitle:"karl marx"`, `inauthor:"karl marx"`},
		},
		{
			nome: "titulo multiplo",
			q:    "dom casmurro",
			want: []string{"dom casmurro", `intitle:"dom casmurro"`, `inauthor:"dom casmurro"`},
		},
	}

	for _, caso := range casos {
		t.Run(caso.nome, func(t *testing.T) {
			got := montarQueriesBusca(caso.q)
			if !reflect.DeepEqual(got, caso.want) {
				t.Fatalf("montarQueriesBusca(%q) = %#v, want %#v", caso.q, got, caso.want)
			}
		})
	}
}

func TestRelevanciaPrefereAutorSobreTituloSobre(t *testing.T) {
	consulta := "marx"

	porAutor := VolumeItem{
		VolumeInfo: volumeInfo{
			Title:   "O Capital",
			Authors: []string{"Karl Marx"},
		},
	}
	sobreAutor := VolumeItem{
		VolumeInfo: volumeInfo{
			Title:   "Reading Marx",
			Authors: []string{"Jane Doe"},
		},
	}

	scoreAutor := RelevanciaVolume(porAutor, consulta)
	scoreSobre := RelevanciaVolume(sobreAutor, consulta)

	if scoreAutor <= scoreSobre {
		t.Fatalf("obra de Karl Marx (%d) deveria ranquear acima de livro sobre Marx (%d)", scoreAutor, scoreSobre)
	}
}

func TestRelevanciaPrefereTituloSobreAutorHomônimo(t *testing.T) {
	consulta := "verity"

	tituloExato := VolumeItem{
		VolumeInfo: volumeInfo{
			Title:   "Verity",
			Authors: []string{"Colleen Hoover"},
		},
	}
	autorHomônimo := VolumeItem{
		VolumeInfo: volumeInfo{
			Title:   "Outro livro qualquer",
			Authors: []string{"Verity Spott"},
		},
	}

	scoreTitulo := RelevanciaVolume(tituloExato, consulta)
	scoreAutor := RelevanciaVolume(autorHomônimo, consulta)

	if scoreTitulo <= scoreAutor {
		t.Fatalf("título Verity (%d) deveria ranquear acima de autor Verity (%d)", scoreTitulo, scoreAutor)
	}
}

func TestRelevanciaMantemTituloForte(t *testing.T) {
	consulta := "dom casmurro"

	tituloExato := VolumeItem{
		VolumeInfo: volumeInfo{
			Title:   "Dom Casmurro",
			Authors: []string{"Machado de Assis"},
		},
	}
	autorIrrelevante := VolumeItem{
		VolumeInfo: volumeInfo{
			Title:   "Outro livro",
			Authors: []string{"Dom Casmurro"},
		},
	}

	scoreTitulo := RelevanciaVolume(tituloExato, consulta)
	scoreAutor := RelevanciaVolume(autorIrrelevante, consulta)

	if scoreTitulo <= scoreAutor {
		t.Fatalf("título exato (%d) deveria ranquear acima de autor homônimo (%d)", scoreTitulo, scoreAutor)
	}
}

func TestRelevanciaPreferePortuguesSobreIngles(t *testing.T) {
	consulta := "harry potter"

	pt := VolumeItem{
		VolumeInfo: volumeInfo{
			Title:    "Harry Potter e a Pedra Filosofal",
			Authors:  []string{"J.K. Rowling"},
			Language: "pt",
		},
	}
	en := VolumeItem{
		VolumeInfo: volumeInfo{
			Title:    "Harry Potter and the Sorcerer's Stone",
			Authors:  []string{"J.K. Rowling"},
			Language: "en",
		},
	}

	scorePT := RelevanciaVolume(pt, consulta)
	scoreEN := RelevanciaVolume(en, consulta)

	if scorePT <= scoreEN {
		t.Fatalf("edição PT (%d) deveria ranquear acima da EN (%d)", scorePT, scoreEN)
	}
}

func TestIdiomaPortugues(t *testing.T) {
	if !idiomaPortugues("pt") || !idiomaPortugues("pt-BR") || !idiomaPortugues("PT-br") {
		t.Fatal("deveria reconhecer códigos pt")
	}
	if idiomaPortugues("en") || idiomaPortugues("") {
		t.Fatal("não deveria tratar en/vazio como português")
	}
}
