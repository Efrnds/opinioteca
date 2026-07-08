package controllers

import (
	"backend/src/auth"
	"backend/src/banco"
	"backend/src/modelos"
	"backend/src/repositorios"
	"backend/src/respostas"
	"backend/src/servicos"
	"backend/src/security"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"
	"strings"

	"github.com/gorilla/mux"
	"github.com/jackc/pgx/v5/pgconn"
)

func nickDaURL(r *http.Request) string {
	return mux.Vars(r)["nick"]
}

func usuarioDoToken(r *http.Request, repositorio *repositorios.Usuarios) (modelos.Usuario, error) {
	usuarioID, erro := auth.ExtrairUsuarioID(r)
	if erro != nil {
		return modelos.Usuario{}, erro
	}
	return repositorio.BuscarPorID(usuarioID)
}

func ehProprioPerfil(usuarioToken modelos.Usuario, nick string) bool {
	return strings.EqualFold(usuarioToken.Nick, nick)
}

// CriarUsuario é a função responsável por criar um novo usuário
func CriarUsuario(w http.ResponseWriter, r *http.Request) {
	corpoRequest, erro := io.ReadAll(r.Body)
	if erro != nil {
		respostas.Erro(w, http.StatusUnprocessableEntity, erro)
		return
	}

	var usuario modelos.Usuario
	if erro = json.Unmarshal(corpoRequest, &usuario); erro != nil {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}

	if erro = usuario.Preparar("cadastro"); erro != nil {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}

	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	repositorio := repositorios.NovoRepositorioDeUsuarios(db)
	usuario.ID, erro = repositorio.Criar(usuario)
	if erro != nil {
		var pgErro *pgconn.PgError
		if errors.As(erro, &pgErro) {
			if pgErro.Code == "23505" {
				respostas.Erro(w, http.StatusConflict, erro)
				return
			}
		}

		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	respostas.JSON(w, http.StatusCreated, usuario.OcultarSenha())
}

// BuscarUsuarios pesquisa usuários ativos por nome ou nick.
func BuscarUsuarios(w http.ResponseWriter, r *http.Request) {
	nomeOuNick := strings.ToLower(r.URL.Query().Get("usuario"))

	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	repositorio := repositorios.NovoRepositorioDeUsuarios(db)
	usuarios, erro := repositorio.Buscar(nomeOuNick)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	usuariosFiltrados := make([]modelos.Usuario, 0)
	for _, usuario := range usuarios {
		usuariosFiltrados = append(usuariosFiltrados, usuario.ListarPublico())
	}
	respostas.JSON(w, http.StatusOK, usuariosFiltrados)
}

// BuscarUsuario retorna o perfil pelo nick — público (auth opcional), privado gated, dono vê privado.
func BuscarUsuario(w http.ResponseWriter, r *http.Request) {
	nick := nickDaURL(r)

	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	repositorio := repositorios.NovoRepositorioDeUsuarios(db)
	usuario, erro := repositorio.BuscarPorNick(nick)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	if usuario.ID == 0 {
		respostas.Erro(w, http.StatusNotFound, errors.New("Usuário não encontrado"))
		return
	}

	viewerID := auth.ExtrairUsuarioIDOpcional(r)
	ehDono := viewerID != 0 && viewerID == usuario.ID

	if usuario.Status != "ativo" {
		if ehDono {
			respostas.JSON(w, http.StatusOK, usuario.ListarPrivado())
			return
		}
		respostas.JSON(w, http.StatusOK, modelos.Usuario{
			ID:           usuario.ID,
			Nick:         "conta_apagada",
			Nome:         "Conta apagada",
			ContaApagada: true,
		})
		return
	}

	if ehDono {
		respostas.JSON(w, http.StatusOK, usuario.ListarPrivado())
		return
	}

	config, _ := repositorios.NovoRepositorioDeConfiguracoes(db).BuscarOuCriar(usuario.ID)
	segue, _ := repositorio.Segue(viewerID, usuario.ID)

	if config.VisibilidadePerfil == modelos.VisibilidadePrivado && !segue {
		respostas.JSON(w, http.StatusOK, usuario.ListarPerfilPrivadoReduzido())
		return
	}

	publico := usuario.ListarPublico()
	if !modelos.PermiteAcesso(config.StreakVisivelPara, false, segue) || !config.MostrarStreak {
		publico.SequenciaAtual = 0
	}

	podeMsg := modelos.PermiteAcesso(config.MensagemDe, false, segue)
	respostas.JSON(w, http.StatusOK, map[string]any{
		"id":                 publico.ID,
		"nome":               publico.Nome,
		"nick":               publico.Nick,
		"image":              publico.Image,
		"rankConfiabilidade": publico.RankConfiabilidade,
		"sequenciaAtual":     publico.SequenciaAtual,
		"perfilPrivado":      false,
		"podeMensagem":       podeMsg,
	})
}

func BuscarUsuarioPorID(w http.ResponseWriter, r *http.Request) {
	usuarioID, erro := strconv.ParseUint(mux.Vars(r)["usuarioId"], 10, 64)
	if erro != nil || usuarioID == 0 {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}

	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	repositorio := repositorios.NovoRepositorioDeUsuarios(db)
	usuario, erro := repositorio.BuscarPorID(usuarioID)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	if usuario.ID == 0 || usuario.Status != "ativo" {
		respostas.Erro(w, http.StatusNotFound, errors.New("Usuário não encontrado"))
		return
	}

	respostas.JSON(w, http.StatusOK, usuario.ListarPublico())
}

// AtualizarUsuario atualiza o perfil — só o dono da conta.
func AtualizarUsuario(w http.ResponseWriter, r *http.Request) {
	nick := nickDaURL(r)

	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	repositorio := repositorios.NovoRepositorioDeUsuarios(db)
	usuarioToken, erro := usuarioDoToken(r, repositorio)
	if erro != nil {
		respostas.Erro(w, http.StatusUnauthorized, erro)
		return
	}

	if !ehProprioPerfil(usuarioToken, nick) {
		respostas.Erro(w, http.StatusUnauthorized, errors.New("Não é permitido atualizar um usuário que não seja o seu"))
		return
	}

	corpoRequisicao, erro := io.ReadAll(r.Body)
	if erro != nil {
		respostas.Erro(w, http.StatusUnprocessableEntity, erro)
		return
	}

	var usuario modelos.Usuario
	if erro = json.Unmarshal(corpoRequisicao, &usuario); erro != nil {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}

	if erro = usuario.Preparar("edicao"); erro != nil {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}

	if erro = repositorio.Atualizar(usuarioToken.ID, usuario); erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	respostas.NoContent(w)
}

// InativarUsuario inativa a própria conta.
func InativarUsuario(w http.ResponseWriter, r *http.Request) {
	nick := nickDaURL(r)

	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	repositorio := repositorios.NovoRepositorioDeUsuarios(db)
	usuarioToken, erro := usuarioDoToken(r, repositorio)
	if erro != nil {
		respostas.Erro(w, http.StatusUnauthorized, erro)
		return
	}

	if !ehProprioPerfil(usuarioToken, nick) {
		respostas.Erro(w, http.StatusUnauthorized, errors.New("Não é permitido inativar um usuário que não seja o seu"))
		return
	}

	if erro = repositorio.Inativar(usuarioToken.ID); erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	respostas.NoContent(w)
}

// SeguirUsuario segue um usuário pelo nick.
func SeguirUsuario(w http.ResponseWriter, r *http.Request) {
	nick := nickDaURL(r)

	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	repositorio := repositorios.NovoRepositorioDeUsuarios(db)
	seguidor, erro := usuarioDoToken(r, repositorio)
	if erro != nil {
		respostas.Erro(w, http.StatusUnauthorized, erro)
		return
	}

	seguido, erro := repositorio.BuscarPorNick(nick)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	if seguido.ID == 0 || seguido.Status != "ativo" {
		respostas.Erro(w, http.StatusNotFound, errors.New("Usuário não encontrado"))
		return
	}

	if seguidor.ID == seguido.ID {
		respostas.Erro(w, http.StatusForbidden, errors.New("Não é permitido seguir a si mesmo"))
		return
	}

	if erro = repositorio.Seguir(seguido.ID, seguidor.ID); erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	ref := seguidor.ID
	servicos.DispararNotificacao(db, seguido.ID, seguidor.ID, "seguidor", seguidor.Nome+" começou a seguir você", "Você tem um novo seguidor.", &ref)

	respostas.NoContent(w)
}

// DeixarSeguirUsuario deixa de seguir um usuário pelo nick.
func DeixarSeguirUsuario(w http.ResponseWriter, r *http.Request) {
	nick := nickDaURL(r)

	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	repositorio := repositorios.NovoRepositorioDeUsuarios(db)
	seguidor, erro := usuarioDoToken(r, repositorio)
	if erro != nil {
		respostas.Erro(w, http.StatusUnauthorized, erro)
		return
	}

	seguido, erro := repositorio.BuscarPorNick(nick)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	if seguido.ID == 0 {
		respostas.Erro(w, http.StatusNotFound, errors.New("Usuário não encontrado"))
		return
	}

	if seguidor.ID == seguido.ID {
		respostas.Erro(w, http.StatusForbidden, errors.New("Não é permitido deixar de seguir a si mesmo"))
		return
	}

	if erro = repositorio.DeixarSeguir(seguido.ID, seguidor.ID); erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	respostas.NoContent(w)
}

// BuscarSeguidores lista seguidores de um perfil pelo nick.
func BuscarSeguidores(w http.ResponseWriter, r *http.Request) {
	nick := nickDaURL(r)

	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	repositorio := repositorios.NovoRepositorioDeUsuarios(db)
	usuario, erro := repositorio.BuscarPorNick(nick)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	if usuario.ID == 0 || usuario.Status != "ativo" {
		respostas.Erro(w, http.StatusNotFound, errors.New("Usuário não encontrado"))
		return
	}

	seguidores, erro := repositorio.BuscarSeguidores(usuario.ID)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	seguidoresPublicos := make([]modelos.Usuario, 0, len(seguidores))
	for _, seguidor := range seguidores {
		seguidoresPublicos = append(seguidoresPublicos, seguidor.ListarPublico())
	}

	respostas.JSON(w, http.StatusOK, seguidoresPublicos)
}

// BuscarSeguindo lista quem o usuário segue pelo nick.
func BuscarSeguindo(w http.ResponseWriter, r *http.Request) {
	nick := nickDaURL(r)

	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	repositorio := repositorios.NovoRepositorioDeUsuarios(db)
	usuario, erro := repositorio.BuscarPorNick(nick)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	if usuario.ID == 0 || usuario.Status != "ativo" {
		respostas.Erro(w, http.StatusNotFound, errors.New("Usuário não encontrado"))
		return
	}

	usuarios, erro := repositorio.BuscarSeguindo(usuario.ID)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	seguindoPublicos := make([]modelos.Usuario, 0, len(usuarios))
	for _, u := range usuarios {
		seguindoPublicos = append(seguindoPublicos, u.ListarPublico())
	}

	respostas.JSON(w, http.StatusOK, seguindoPublicos)
}

// AtualizarSenha atualiza a senha — só o dono da conta.
func AtualizarSenha(w http.ResponseWriter, r *http.Request) {
	nick := nickDaURL(r)

	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	repositorio := repositorios.NovoRepositorioDeUsuarios(db)
	usuarioToken, erro := usuarioDoToken(r, repositorio)
	if erro != nil {
		respostas.Erro(w, http.StatusUnauthorized, erro)
		return
	}

	if !ehProprioPerfil(usuarioToken, nick) {
		respostas.Erro(w, http.StatusForbidden, errors.New("Não é permitido atualizar a senha de um usuário que não seja o seu"))
		return
	}

	corpoRequisicao, erro := io.ReadAll(r.Body)
	if erro != nil {
		respostas.Erro(w, http.StatusUnprocessableEntity, erro)
		return
	}

	var senha modelos.Senha
	if erro = json.Unmarshal(corpoRequisicao, &senha); erro != nil {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}

	senhaSalvaNoBanco, erro := repositorio.BuscarSenha(usuarioToken.ID)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	if erro = security.VerificarSenha(senhaSalvaNoBanco, senha.Atual); erro != nil {
		respostas.Erro(w, http.StatusUnauthorized, errors.New("A senha atual não condiz com a que está salva no banco"))
		return
	}

	senhaComHash, erro := security.Hash(senha.Nova)
	if erro != nil {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}

	if erro = repositorio.AtualizarSenha(usuarioToken.ID, string(senhaComHash)); erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	respostas.NoContent(w)
}
