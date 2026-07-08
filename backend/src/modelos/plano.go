package modelos

import "time"

const (
	PlanoGratuitoID  uint64 = 1
	PlanoOpinioTopID uint64 = 2
	PlanoOpinioProID uint64 = 3
)

// PlanoStatus resume o plano efetivo do usuário (considera expiração).
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

// PlanoIDPorCodigo resolve o ID do plano pelo código (gratuito, opiniotop, opiniopro).
func PlanoIDPorCodigo(codigo string) (uint64, bool) {
	id, ok := planoIDPorCodigo[codigo]
	return id, ok
}

// PlanoAtivo indica se o plano pago do usuário ainda está vigente.
// Gratuito é sempre considerado ativo; plano pago sem data de expiração é vitalício.
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

// PlanoVitalicio indica assinatura paga sem data de expiração (nunca expira).
func PlanoVitalicio(usuario Usuario) bool {
	if usuario.AssinaturaID == PlanoGratuitoID {
		return false
	}
	return PtrTempoJSON(usuario.AssinaturaExpiraEm) == nil
}

// PlanoEfetivoID retorna o ID do plano em vigor (downgrade para gratuito se expirado).
func PlanoEfetivoID(usuario Usuario) uint64 {
	if usuario.AssinaturaID == PlanoGratuitoID {
		return PlanoGratuitoID
	}
	if PlanoAtivo(usuario) {
		return usuario.AssinaturaID
	}
	return PlanoGratuitoID
}

// TemPlanoTop indica acesso a recursos do OpinioTop (inclui OpinioPro).
func TemPlanoTop(usuario Usuario) bool {
	id := PlanoEfetivoID(usuario)
	return id == PlanoOpinioTopID || id == PlanoOpinioProID
}

// TemPlanoPro indica acesso a recursos exclusivos do OpinioPro.
func TemPlanoPro(usuario Usuario) bool {
	return PlanoEfetivoID(usuario) == PlanoOpinioProID
}

// StatusPlano monta o objeto exposto nas respostas da API.
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

// AssinaturaCatalogo descreve um plano disponível no catálogo.
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
