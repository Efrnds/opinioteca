package controllers

import (
	"backend/src/auth"
	"backend/src/banco"
	"backend/src/modelos"
	"backend/src/repositorios"
	"backend/src/respostas"
	"database/sql"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"
	"time"

	"github.com/gorilla/mux"
)

var labelsSemana = []string{"D", "S", "T", "Q", "Q", "S", "S"}

const timezoneDiario = "America/Sao_Paulo"

func agoraDiario() time.Time {
	local, erro := time.LoadLocation(timezoneDiario)
	if erro != nil {
		return time.Now()
	}
	return time.Now().In(local)
}

func truncarDia(t time.Time) time.Time {
	y, m, d := t.Date()
	return time.Date(y, m, d, 0, 0, 0, 0, t.Location())
}

func inicioSemana(t time.Time) time.Time {
	t = truncarDia(t)
	return t.AddDate(0, 0, -int(t.Weekday()))
}

func calcularSequencia(sequenciaAtual int, ultimoDia *time.Time, hoje time.Time) int {
	hoje = truncarDia(hoje)
	if ultimoDia == nil {
		return 1
	}
	ultimo := truncarDia(*ultimoDia)
	if ultimo.Equal(hoje) {
		return sequenciaAtual
	}
	ontem := hoje.AddDate(0, 0, -1)
	if ultimo.Equal(ontem) {
		if sequenciaAtual <= 0 {
			return 1
		}
		return sequenciaAtual + 1
	}
	return 1
}

func montarRespostaDiario(sequencia int, dias map[string]bool, referencia time.Time) modelos.DiarioResposta {
	inicio := inicioSemana(referencia)
	semana := make([]modelos.DiaSemana, 7)
	for i := 0; i < 7; i++ {
		dia := inicio.AddDate(0, 0, i)
		semana[i] = modelos.DiaSemana{
			Dia: labelsSemana[i],
			Leu: dias[dia.Format("2006-01-02")],
		}
	}
	return modelos.DiarioResposta{
		SequenciaAtual: sequencia,
		Semana:         semana,
	}
}

func buscarDiarioUsuario(db *sql.DB, usuarioID uint64) (modelos.DiarioResposta, error) {
	repoUsuarios := repositorios.NovoRepositorioDeUsuarios(db)
	repoDiario := repositorios.NovoRepositorioDeDiario(db)

	usuario, erro := repoUsuarios.BuscarPorID(usuarioID)
	if erro != nil {
		return modelos.DiarioResposta{}, erro
	}

	agora := agoraDiario()
	inicio := inicioSemana(agora)
	fim := inicio.AddDate(0, 0, 6)

	dias, erro := repoDiario.BuscarDiasDaSemana(usuario.ID, inicio, fim)
	if erro != nil {
		return modelos.DiarioResposta{}, erro
	}

	sequencia := usuario.SequenciaAtual
	ultimoDia, erro := repoDiario.BuscarUltimoDiaLeitura(usuario.ID)
	if erro == nil && ultimoDia != nil {
		ultimo := truncarDia(*ultimoDia)
		hoje := truncarDia(agora)
		ontem := hoje.AddDate(0, 0, -1)
		if !ultimo.Equal(hoje) && !ultimo.Equal(ontem) {
			sequencia = 0
		}
	} else if ultimoDia == nil {
		sequencia = 0
	}

	return montarRespostaDiario(sequencia, dias, agora), nil
}

func RegistrarDiario(w http.ResponseWriter, r *http.Request) {
	usuarioID, erro := auth.ExtrairUsuarioID(r)
	if erro != nil {
		respostas.Erro(w, http.StatusUnauthorized, erro)
		return
	}

	corpo, erro := io.ReadAll(r.Body)
	if erro != nil {
		respostas.Erro(w, http.StatusUnprocessableEntity, erro)
		return
	}

	var req modelos.RegistrarDiarioRequest
	if erro = json.Unmarshal(corpo, &req); erro != nil {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}
	if erro = req.Preparar(); erro != nil {
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
	repoDiario := repositorios.NovoRepositorioDeDiario(db)
	repoLivros := repositorios.NovoRepositorioDeLivros(db)

	if _, erro = repoLivros.BuscarPorID(req.LivroID); erro == sql.ErrNoRows {
		respostas.Erro(w, http.StatusNotFound, errors.New("Livro não encontrado"))
		return
	}
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	usuario, erro := repoUsuarios.BuscarPorID(usuarioID)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	agora := agoraDiario()
	jaLeuHoje, erro := repoDiario.JaLeuHoje(usuarioID, agora)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	var novaSequencia int
	if jaLeuHoje {
		respostas.Erro(w, http.StatusConflict, errors.New("Leitura de hoje já registrada"))
		return
	} else {
		ultimoDia, erro := repoDiario.BuscarUltimoDiaLeitura(usuarioID)
		if erro != nil {
			respostas.Erro(w, http.StatusInternalServerError, erro)
			return
		}
		novaSequencia = calcularSequencia(usuario.SequenciaAtual, ultimoDia, agora)
	}

	tx, erro := db.Begin()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer tx.Rollback()

	registro := modelos.DiarioLeitura{
		UsuarioID:          usuarioID,
		LivroID:            req.LivroID,
		PaginasLidas:       req.PaginasLidas,
		PorcentagemLeitura: req.PorcentagemLeitura,
	}

	id, erro := repoDiario.Registrar(tx, registro)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	registro.ID = id

	if erro = repoUsuarios.AtualizarSequencia(tx, usuarioID, novaSequencia); erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	if erro = tx.Commit(); erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	resposta, erro := buscarDiarioUsuario(db, usuarioID)
	if erro != nil {
		respostas.JSON(w, http.StatusCreated, registro)
		return
	}
	resposta.SequenciaAtual = novaSequencia
	respostas.JSON(w, http.StatusCreated, resposta)
}

func BuscarDiario(w http.ResponseWriter, r *http.Request) {
	nick := mux.Vars(r)["nick"]

	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	usuario, erro := repositorios.NovoRepositorioDeUsuarios(db).BuscarPorNick(nick)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	if usuario.ID == 0 {
		respostas.Erro(w, http.StatusNotFound, errors.New("Usuário não encontrado"))
		return
	}

	resposta, erro := buscarDiarioUsuario(db, usuario.ID)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	respostas.JSON(w, http.StatusOK, resposta)
}

func BuscarHistoricoDiario(w http.ResponseWriter, r *http.Request) {
	nick := mux.Vars(r)["nick"]

	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	repoUsuarios := repositorios.NovoRepositorioDeUsuarios(db)
	repoDiario := repositorios.NovoRepositorioDeDiario(db)

	usuario, erro := repoUsuarios.BuscarPorNick(nick)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	if usuario.ID == 0 {
		respostas.Erro(w, http.StatusNotFound, errors.New("Usuário não encontrado"))
		return
	}

	limite := 30
	if valor := r.URL.Query().Get("limite"); valor != "" {
		if parsed, erro := strconv.Atoi(valor); erro == nil && parsed > 0 && parsed <= 100 {
			limite = parsed
		}
	}

	registros, erro := repoDiario.BuscarHistorico(usuario.ID, limite)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	livros, erro := repoDiario.BuscarResumoLivros(usuario.ID)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	respostas.JSON(w, http.StatusOK, modelos.DiarioHistoricoResposta{
		Registros: registros,
		Livros:    livros,
	})
}
