package modelos

import "time"

// TempoJSONSeguro indica se t pode ser serializado em JSON (encoding/json exige ano em [0, 9999]).
func TempoJSONSeguro(t time.Time) bool {
	if t.IsZero() {
		return false
	}
	y := t.Year()
	return y >= 0 && y < 10000
}

// PtrTempoJSON retorna nil para timestamps inválidos, zero ou fora do intervalo JSON.
func PtrTempoJSON(t *time.Time) *time.Time {
	if t == nil || !TempoJSONSeguro(*t) {
		return nil
	}
	return t
}
