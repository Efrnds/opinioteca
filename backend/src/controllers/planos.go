package controllers



import (

	"backend/src/banco"

	"backend/src/modelos"

	"backend/src/repositorios"

	"backend/src/respostas"

	"encoding/json"

	"errors"

	"io"

	"net/http"

	"strings"

	"time"

)



// ListarPlanos retorna o catálogo de planos disponíveis.

func ListarPlanos(w http.ResponseWriter, r *http.Request) {

	db, erro := banco.Conectar()

	if erro != nil {

		respostas.Erro(w, http.StatusInternalServerError, erro)

		return

	}

	defer db.Close()



	repositorio := repositorios.NovoRepositorioDeAssinaturas(db)

	planos, erro := repositorio.Listar()

	if erro != nil {

		respostas.Erro(w, http.StatusInternalServerError, erro)

		return

	}



	respostas.JSON(w, http.StatusOK, planos)

}



// BuscarPlanoUsuario retorna o status do plano do usuário autenticado.

func BuscarPlanoUsuario(w http.ResponseWriter, r *http.Request) {

	nick := nickDaURL(r)



	db, erro := banco.Conectar()

	if erro != nil {

		respostas.Erro(w, http.StatusInternalServerError, erro)

		return

	}

	defer db.Close()



	repoUsuarios := repositorios.NovoRepositorioDeUsuarios(db)

	usuarioToken, erro := usuarioDoToken(r, repoUsuarios)

	if erro != nil {

		respostas.Erro(w, http.StatusUnauthorized, erro)

		return

	}



	if !ehProprioPerfil(usuarioToken, nick) {

		respostas.Erro(w, http.StatusForbidden, errors.New("Acesso negado"))

		return

	}



	usuario, erro := repoUsuarios.BuscarPorNick(nick)

	if erro != nil {

		respostas.Erro(w, http.StatusInternalServerError, erro)

		return

	}

	if usuario.ID == 0 {

		respostas.Erro(w, http.StatusNotFound, errors.New("Usuário não encontrado"))

		return

	}



	respostas.JSON(w, http.StatusOK, modelos.StatusPlano(usuario))

}



type atribuirPlanoPayload struct {

	Codigo       string `json:"codigo"`

	DuracaoDias  *int   `json:"duracaoDias"`

	DuracaoMeses *int   `json:"duracaoMeses"`

	ExpiraEm     string `json:"expiraEm"`

	Vitalicia    bool   `json:"vitalicia"`

}



// calcularExpiracao define a data de fim a partir de agora (troca de plano não estende expiração anterior).

func calcularExpiracao(payload atribuirPlanoPayload) (*time.Time, error) {

	agora := time.Now()



	if payload.ExpiraEm != "" {

		t, erro := time.Parse(time.RFC3339, payload.ExpiraEm)

		if erro != nil {

			return nil, errors.New("expiraEm deve estar em formato RFC3339")

		}

		if !t.After(agora) {

			return nil, errors.New("expiraEm deve ser uma data futura")

		}

		if !modelos.TempoJSONSeguro(t) {

			return nil, errors.New("expiraEm fora do intervalo permitido")

		}

		return &t, nil

	}



	if payload.DuracaoDias != nil && *payload.DuracaoDias > 0 {

		t := agora.AddDate(0, 0, *payload.DuracaoDias)

		if !modelos.TempoJSONSeguro(t) {

			return nil, errors.New("duracaoDias resulta em data inválida")

		}

		return &t, nil

	}



	if payload.DuracaoMeses != nil && *payload.DuracaoMeses > 0 {

		t := agora.AddDate(0, *payload.DuracaoMeses, 0)

		if !modelos.TempoJSONSeguro(t) {

			return nil, errors.New("duracaoMeses resulta em data inválida")

		}

		return &t, nil

	}



	return nil, nil

}



// AdminAtribuirPlano substitui plano e duração de um usuário (upsert: não exige revogar antes).

func AdminAtribuirPlano(w http.ResponseWriter, r *http.Request) {

	usuarioID, erro := usuarioIDDaURL(r)

	if erro != nil {

		respostas.Erro(w, http.StatusBadRequest, erro)

		return

	}



	corpo, erro := io.ReadAll(r.Body)

	if erro != nil {

		respostas.Erro(w, http.StatusUnprocessableEntity, erro)

		return

	}



	var payload atribuirPlanoPayload

	if erro = json.Unmarshal(corpo, &payload); erro != nil {

		respostas.Erro(w, http.StatusBadRequest, erro)

		return

	}



	codigo := strings.ToLower(strings.TrimSpace(payload.Codigo))

	assinaturaID, ok := modelos.PlanoIDPorCodigo(codigo)

	if !ok {

		respostas.Erro(w, http.StatusBadRequest, errors.New("Código de plano inválido. Use: gratuito, opiniotop ou opiniopro"))

		return

	}



	var expiraEm *time.Time

	switch {

	case assinaturaID == modelos.PlanoGratuitoID:

		expiraEm = nil

	case payload.Vitalicia:

		// Vitalícia: NULL no banco; plano pago nunca expira.

		expiraEm = nil

	default:

		expiraEm, erro = calcularExpiracao(payload)

		if erro != nil {

			respostas.Erro(w, http.StatusBadRequest, erro)

			return

		}

		if expiraEm == nil {

			respostas.Erro(w, http.StatusBadRequest, errors.New("informe duracaoDias, duracaoMeses, expiraEm ou vitalicia para planos pagos"))

			return

		}

	}



	db, erro := banco.Conectar()

	if erro != nil {

		respostas.Erro(w, http.StatusInternalServerError, erro)

		return

	}

	defer db.Close()



	repoUsuarios := repositorios.NovoRepositorioDeUsuarios(db)

	usuario, erro := repoUsuarios.BuscarPorID(usuarioID)

	if erro != nil {

		respostas.Erro(w, http.StatusInternalServerError, erro)

		return

	}

	if usuario.ID == 0 {

		respostas.Erro(w, http.StatusNotFound, errors.New("Usuário não encontrado"))

		return

	}



	if erro = repoUsuarios.AtribuirPlano(usuarioID, assinaturaID, expiraEm); erro != nil {

		respostas.Erro(w, http.StatusInternalServerError, erro)

		return

	}



	usuario, erro = repoUsuarios.BuscarPorID(usuarioID)

	if erro != nil {

		respostas.Erro(w, http.StatusInternalServerError, erro)

		return

	}



	respostas.JSON(w, http.StatusOK, modelos.StatusPlano(usuario))

}



// AdminRevogarPlano remove assinatura paga e volta ao gratuito.

func AdminRevogarPlano(w http.ResponseWriter, r *http.Request) {

	usuarioID, erro := usuarioIDDaURL(r)

	if erro != nil {

		respostas.Erro(w, http.StatusBadRequest, erro)

		return

	}



	db, erro := banco.Conectar()

	if erro != nil {

		respostas.Erro(w, http.StatusInternalServerError, erro)

		return

	}

	defer db.Close()



	repoUsuarios := repositorios.NovoRepositorioDeUsuarios(db)

	usuario, erro := repoUsuarios.BuscarPorID(usuarioID)

	if erro != nil {

		respostas.Erro(w, http.StatusInternalServerError, erro)

		return

	}

	if usuario.ID == 0 {

		respostas.Erro(w, http.StatusNotFound, errors.New("Usuário não encontrado"))

		return

	}



	if erro = repoUsuarios.RevogarPlano(usuarioID); erro != nil {

		respostas.Erro(w, http.StatusInternalServerError, erro)

		return

	}



	usuario, erro = repoUsuarios.BuscarPorID(usuarioID)

	if erro != nil {

		respostas.Erro(w, http.StatusInternalServerError, erro)

		return

	}



	respostas.JSON(w, http.StatusOK, modelos.StatusPlano(usuario))

}


