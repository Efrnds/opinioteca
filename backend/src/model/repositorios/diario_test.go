package repositorios

import (
	"testing"
	"time"
)

func TestIntervaloEstatisticasLeitura(t *testing.T) {
	casos := []struct {
		nome, agora, periodo, inicio, fim string
	}{
		{"hoje no fuso de Sao Paulo", "2026-11-04T01:00:00Z", "hoje", "2026-11-03", "2026-11-04"},
		{"semana atual", "2026-11-04T15:00:00Z", "semana", "2026-11-01", "2026-11-08"},
		{"domingo inicia semana", "2026-11-08T15:00:00Z", "semana", "2026-11-08", "2026-11-15"},
		{"semana atravessa ano", "2027-01-01T15:00:00Z", "semana", "2026-12-27", "2027-01-03"},
		{"mes bissexto", "2028-02-29T15:00:00Z", "mes", "2028-02-01", "2028-03-01"},
		{"ano atual", "2026-11-04T15:00:00Z", "ano", "2026-01-01", "2027-01-01"},
	}
	for _, caso := range casos {
		t.Run(caso.nome, func(t *testing.T) {
			agora, err := time.Parse(time.RFC3339, caso.agora)
			if err != nil {
				t.Fatal(err)
			}
			inicio, fim := intervaloEstatisticasLeitura(agora, caso.periodo)
			if inicio.Format("2006-01-02") != caso.inicio || fim.Format("2006-01-02") != caso.fim {
				t.Fatalf("intervalo = [%s, %s), esperado [%s, %s)", inicio, fim, caso.inicio, caso.fim)
			}
			if inicio.Hour() != 0 || fim.Hour() != 0 || inicio.Location().String() != timezoneDiario {
				t.Fatalf("intervalo deve usar meia-noite no fuso %s", timezoneDiario)
			}
		})
	}
}

func TestIntervaloEstatisticasTempoTodo(t *testing.T) {
	inicio, fim := intervaloEstatisticasLeitura(time.Now(), "tudo")
	if !inicio.IsZero() || !fim.IsZero() {
		t.Fatal("tempo todo deve remover os limites de data")
	}
}
