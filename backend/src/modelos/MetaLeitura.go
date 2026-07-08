package modelos

import "errors"

type MetaLeitura struct {
	Tipo      string `json:"tipo"`
	Periodo   string `json:"periodo"`
	Meta      int    `json:"meta"`
	Progresso int    `json:"progresso"`
	Percentual float64 `json:"percentual"`
}

type MetaLeituraRequest struct {
	Tipo    string `json:"tipo"`
	Periodo string `json:"periodo"`
	Meta    int    `json:"meta"`
}

func (req *MetaLeituraRequest) Preparar() error {
	if req.Tipo != "paginas" && req.Tipo != "livros" {
		return errors.New("Tipo de meta inválido. Use paginas ou livros.")
	}
	if req.Periodo != "mensal" && req.Periodo != "anual" {
		return errors.New("Período inválido. Use mensal ou anual.")
	}
	if req.Meta <= 0 {
		return errors.New("A meta deve ser maior que zero.")
	}
	if req.Meta > 10000 {
		return errors.New("A meta informada é muito alta.")
	}
	return nil
}
