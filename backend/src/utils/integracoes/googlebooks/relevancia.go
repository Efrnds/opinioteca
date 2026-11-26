package googlebooks

import (
	"math"
	"strings"
)

// RelevanciaVolume: volume.
func RelevanciaVolume(item VolumeItem, consulta string) int {
	titulo := normalizarTextoBusca(item.VolumeInfo.Title)
	autor := normalizarTextoBusca(strings.Join(item.VolumeInfo.Authors, " "))
	consulta = normalizarTextoBusca(consulta)

	score := similaridadeTitulo(titulo, consulta)
	score += similaridadeAutor(autor, consulta)
	score += pontuarPopularidade(item.VolumeInfo.RatingsCount, item.VolumeInfo.AverageRating)
	score += penalidadesTitulo(titulo, consulta)
	score += bonusIdiomaPortugues(item.VolumeInfo.Language, titulo)
	return score
}

// idiomaPortugues: portugues.
func idiomaPortugues(lang string) bool {
	lang = strings.ToLower(strings.TrimSpace(lang))
	return lang == "pt" || strings.HasPrefix(lang, "pt-")
}

// bonusIdiomaPortugues: idioma portugues.
func bonusIdiomaPortugues(lang, tituloNormalizado string) int {
	if idiomaPortugues(lang) {
		return 320
	}

	indicadoresPT := []string{
		" e a ", " e o ", " e as ", " e os ", "filosofal", "camara secreta",
		"prisioneiro de azkaban", "calice de fogo", "ordem da fenix",
		"enigma do principe", "reliquias da morte", "aneis",
	}
	for _, ind := range indicadoresPT {
		if strings.Contains(tituloNormalizado, ind) {
			return 180
		}
	}
	return 0
}

// RelevanciaLivro: livro.
func RelevanciaLivro(titulo, autor, consulta string, bonus int) int {
	titulo = normalizarTextoBusca(titulo)
	autor = normalizarTextoBusca(autor)
	consulta = normalizarTextoBusca(consulta)

	score := similaridadeTitulo(titulo, consulta)
	score += similaridadeAutor(autor, consulta)
	score += penalidadesTitulo(titulo, consulta)
	score += bonus
	return score
}

// Normaliza texto busca.
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

// similaridadeTitulo: titulo.
func similaridadeTitulo(texto, consulta string) int {
	if texto == "" || consulta == "" {
		return 0
	}

	score := 0

	if texto == consulta {
		score += 450
	} else if strings.HasPrefix(texto, consulta+" ") || strings.HasPrefix(texto, consulta) {
		score += 280
	} else if strings.Contains(texto, consulta) {
		score += 120
	}

	termos := strings.Fields(consulta)
	matched := 0
	for _, termo := range termos {
		if strings.Contains(texto, termo) {
			matched++
			score += 12
		}
	}

	if len(termos) > 0 && matched == len(termos) {
		score += 60
	}

	if strings.Contains(texto, " and the ") || strings.Contains(texto, " e a ") || strings.Contains(texto, " e o ") {
		score += 25
	}

	return score
}

// similaridadeAutor: autor.
func similaridadeAutor(autor, consulta string) int {
	if autor == "" || consulta == "" {
		return 0
	}

	score := 0
	if strings.Contains(autor, consulta) {
		score += 100
	}

	termosConsulta := strings.Fields(consulta)
	tokensAutor := strings.Fields(autor)
	matched := 0

	for _, termo := range termosConsulta {
		achou := false
		for _, token := range tokensAutor {
			if token == termo {
				score += 40
				achou = true
				break
			}
			if len(termo) >= 3 && strings.HasPrefix(token, termo) {
				score += 20
				achou = true
				break
			}
			if strings.Contains(token, termo) {
				score += 10
				achou = true
				break
			}
		}
		if achou || strings.Contains(autor, termo) {
			matched++
			score += 8
		}
	}

	if len(termosConsulta) > 0 && matched == len(termosConsulta) {
		score += 30
	}

	return score
}

// pontuarPopularidade: popularidade.
func pontuarPopularidade(ratingsCount int, averageRating float64) int {
	if ratingsCount <= 0 {
		return 0
	}
	countScore := int(math.Log10(float64(ratingsCount)+1) * 40)
	ratingScore := int(averageRating * 4)
	return countScore + ratingScore
}

// penalidadesTitulo: titulo.
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

	if consulta != "" && titulo != consulta && strings.Contains(titulo, consulta) && !strings.HasPrefix(titulo, consulta) {
		penalidade -= 15
	}
	return penalidade
}
