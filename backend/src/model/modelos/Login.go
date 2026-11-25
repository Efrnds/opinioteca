package modelos

type LoginResposta struct {
	Token   string  `json:"token"`
	IsAdmin bool    `json:"isAdmin"`
	Usuario Usuario `json:"usuario"`
}
