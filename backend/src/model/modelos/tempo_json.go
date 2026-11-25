package modelos

import "time"

func TempoJSONSeguro(t time.Time) bool {
	if t.IsZero() {
		return false
	}
	y := t.Year()
	return y >= 0 && y < 10000
}

func PtrTempoJSON(t *time.Time) *time.Time {
	if t == nil || !TempoJSONSeguro(*t) {
		return nil
	}
	return t
}
