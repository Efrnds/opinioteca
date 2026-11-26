package modelos

import "time"

// TempoJSONSeguro: json seguro.
func TempoJSONSeguro(t time.Time) bool {
	if t.IsZero() {
		return false
	}
	y := t.Year()
	return y >= 0 && y < 10000
}

// PtrTempoJSON: tempo json.
func PtrTempoJSON(t *time.Time) *time.Time {
	if t == nil || !TempoJSONSeguro(*t) {
		return nil
	}
	return t
}
