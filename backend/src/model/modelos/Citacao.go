package modelos

type Citacao struct {
	ID     uint64 `json:"id"`
	Texto  string `json:"texto"`
	Autor  string `json:"autor"`
}
