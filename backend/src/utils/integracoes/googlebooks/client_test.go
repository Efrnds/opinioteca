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
			want: []string{"marx", "inauthor:marx"},
		},
		{
			nome: "kant",
			q:    "kant",
			want: []string{"kant", "inauthor:kant"},
		},
		{
			nome: "nome completo",
			q:    "karl marx",
			want: []string{"karl marx", `inauthor:"karl marx"`, `intitle:"karl marx"`},
		},
		{
			nome: "titulo multiplo",
			q:    "dom casmurro",
			want: []string{"dom casmurro", `inauthor:"dom casmurro"`, `intitle:"dom casmurro"`},
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

	// Ambos batem o termo; o importante é o título continuar bem pontuado.
	if scoreTitulo < 150 {
		t.Fatalf("título exato deveria pontuar alto, got %d", scoreTitulo)
	}
	if scoreAutor < 150 {
		t.Fatalf("autor contendo a consulta deveria pontuar alto, got %d", scoreAutor)
	}
}
