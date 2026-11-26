package modelos

import "time"

const (
	PlanoGratuitoID  uint64 = 1
	PlanoOpinioTopID uint64 = 2
	PlanoOpinioProID uint64 = 3
)

type PlanoStatus struct {
	Codigo             string     `json:"codigo"`
	Nome               string     `json:"nome"`
	AssinaturaID       uint64     `json:"assinaturaId"`
	AssinaturaExpiraEm *time.Time `json:"assinaturaExpiraEm,omitempty"`
	Vitalicia          bool       `json:"vitalicia"`
	Ativo              bool       `json:"ativo"`
	TemPlanoTop        bool       `json:"temPlanoTop"`
	TemPlanoPro        bool       `json:"temPlanoPro"`
}

var planosPorID = map[uint64]struct {
	Codigo string
	Nome   string
}{
	PlanoGratuitoID:  {Codigo: "gratuito", Nome: "Gratuito"},
	PlanoOpinioTopID: {Codigo: "opiniotop", Nome: "OpinioTop"},
	PlanoOpinioProID: {Codigo: "opiniopro", Nome: "OpinioPro"},
}

var planoIDPorCodigo = map[string]uint64{
	"gratuito":  PlanoGratuitoID,
	"opiniotop": PlanoOpinioTopID,
	"opiniopro": PlanoOpinioProID,
}

// PlanoIDPorCodigo: id por codigo na regra de plano.
func PlanoIDPorCodigo(codigo string) (uint64, bool) {
	id, ok := planoIDPorCodigo[codigo]
	return id, ok
}

// PlanoAtivo: ativo na regra de plano.
func PlanoAtivo(usuario Usuario) bool {
	if usuario.AssinaturaID == PlanoGratuitoID {
		return true
	}
	expira := PtrTempoJSON(usuario.AssinaturaExpiraEm)
	if expira == nil {
		return true
	}
	return expira.After(time.Now())
}

// PlanoVitalicio: vitalicio na regra de plano.
func PlanoVitalicio(usuario Usuario) bool {
	if usuario.AssinaturaID == PlanoGratuitoID {
		return false
	}
	return PtrTempoJSON(usuario.AssinaturaExpiraEm) == nil
}

// Devolve o plano atual e cai para gratuito se a data paga já passou.
func PlanoEfetivoID(usuario Usuario) uint64 {
	if usuario.AssinaturaID == PlanoGratuitoID {
		return PlanoGratuitoID
	}
	if PlanoAtivo(usuario) {
		return usuario.AssinaturaID
	}
	return PlanoGratuitoID
}

// Verdadeiro para OpinioTop e também para OpinioPro, que inclui o Top.
func TemPlanoTop(usuario Usuario) bool {
	id := PlanoEfetivoID(usuario)
	return id == PlanoOpinioTopID || id == PlanoOpinioProID
}

// Verdadeiro só quando o plano vigente é OpinioPro.
func TemPlanoPro(usuario Usuario) bool {
	return PlanoEfetivoID(usuario) == PlanoOpinioProID
}

// StatusPlano: plano na regra de plano.
func StatusPlano(usuario Usuario) PlanoStatus {
	efetivoID := PlanoEfetivoID(usuario)
	info := planosPorID[efetivoID]
	ativo := PlanoAtivo(usuario)

	return PlanoStatus{
		Codigo:             info.Codigo,
		Nome:               info.Nome,
		AssinaturaID:       usuario.AssinaturaID,
		AssinaturaExpiraEm: PtrTempoJSON(usuario.AssinaturaExpiraEm),
		Vitalicia:          PlanoVitalicio(usuario),
		Ativo:              ativo,
		TemPlanoTop:        TemPlanoTop(usuario),
		TemPlanoPro:        TemPlanoPro(usuario),
	}
}

type AssinaturaCatalogo struct {
	ID                    uint64  `json:"id"`
	Codigo                string  `json:"codigo"`
	Nome                  string  `json:"nome"`
	Nivel                 int     `json:"nivel"`
	AnaliseSentimento     bool    `json:"analiseSentimento"`
	ModoZen               bool    `json:"modoZen"`
	TemplatesEnriquecidos bool    `json:"templatesEnriquecidos"`
	PrecoMensal           float64 `json:"precoMensal"`
	PrecoAnual            float64 `json:"precoAnual"`
}
