package googlebooks

import (
	"math"
	"strings"
)

func RelevanciaVolume(item VolumeItem, consulta string) int {
	titulo := normalizarTextoBusca(item.VolumeInfo.Title)
	autor := normalizarTextoBusca(strings.Join(item.VolumeInfo.Authors, " "))
	consulta = normalizarTextoBusca(consulta)

	score := similaridadeTexto(titulo, consulta, true)
	score += similaridadeTexto(autor, consulta, false)
	score += pontuarPopularidade(item.VolumeInfo.RatingsCount, item.VolumeInfo.AverageRating)
	score += penalidadesTitulo(titulo, consulta)
	return score
}

func RelevanciaLivro(titulo, autor, consulta string, bonus int) int {
	titulo = normalizarTextoBusca(titulo)
	autor = normalizarTextoBusca(autor)
	consulta = normalizarTextoBusca(consulta)

	score := similaridadeTexto(titulo, consulta, true)
	score += similaridadeTexto(autor, consulta, false)
	score += penalidadesTitulo(titulo, consulta)
	score += bonus
	return score
}

func normalizarTextoBusca(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	replacer := strings.NewReplacer(
		"á", "a", "à", "a", "ã", "a", "â", "a",
		"é", "e", "ê", "e",
		"í", "i",
		"ó", "o", "ô", "o", "õ", "o",
		"ú", "u", "ç", "c",
		":", " ", "-", " ", "'", "", "\"", "", ".", " ", ",", " ",
	)
	return strings.Join(strings.Fields(replacer.Replace(s)), " ")
}

func similaridadeTexto(texto, consulta string, ehTitulo bool) int {
	if texto == "" || consulta == "" {
		return 0
	}

	score := 0
	pesoTermo := 8
	if ehTitulo {
		pesoTermo = 12
	}

	if ehTitulo && strings.Contains(texto, consulta) {
		score += 150
	}
	if ehTitulo && strings.HasPrefix(texto, consulta) {
		score += 50
	}

	termos := strings.Fields(consulta)
	matched := 0
	for _, termo := range termos {
		if strings.Contains(texto, termo) {
			matched++
			score += pesoTermo
		}
	}

	if ehTitulo && len(termos) > 0 && matched == len(termos) {
		score += 60
	}

	if ehTitulo {
		if strings.Contains(texto, " and the ") || strings.Contains(texto, " e a ") || strings.Contains(texto, " e o ") {
			score += 25
		}
		if texto == consulta {
			score -= 35
		}
	}

	return score
}

func pontuarPopularidade(ratingsCount int, averageRating float64) int {
	if ratingsCount <= 0 {
		return 0
	}
	countScore := int(math.Log10(float64(ratingsCount)+1) * 40)
	ratingScore := int(averageRating * 4)
	return countScore + ratingScore
}

func penalidadesTitulo(titulo, consulta string) int {
	penalidade := 0
	indicadores := []string{
		"critical perspectives", "perspectivas criticas", "de a a z", "from a to z",
		"encyclopedia", "enciclopedia", "companion", "guide to", "guia ",
		"reading ", "universe of", "universo de", "behind the scenes",
		"brand ", "marketing", "film companion", "lexicon", "critical ",
		"handbook", "manual de", "ensaios sobre", "essays on",
	}
	for _, indicador := range indicadores {
		if strings.Contains(titulo, indicador) {
			penalidade -= 50
		}
	}
	if titulo == consulta {
		penalidade -= 20
	}
	return penalidade
}
