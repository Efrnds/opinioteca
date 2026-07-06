package controllers

import (
	"backend/src/banco"
	"backend/src/modelos"
	"backend/src/repositorios"
	"backend/src/respostas"
	"errors"
	"net/http"
	"strconv"
)

func consultaRelatorio(r *http.Request) string {
	return r.URL.Query().Get("q")
}

func tipoRelatorio(r *http.Request) string {
	return r.URL.Query().Get("tipo")
}

// AdminRelatorioComentarios lista comentários filtrados por livro, usuário ou categoria.
func AdminRelatorioComentarios(w http.ResponseWriter, r *http.Request) {
	consulta := consultaRelatorio(r)
	tipo := tipoRelatorio(r)

	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	repo := repositorios.NovoRepositorioDeRelatorios(db)
	var itens []modelos.ComentarioRelatorioItem

	switch tipo {
	case "livro":
		itens, erro = repo.ComentariosPorLivro(consulta)
	case "usuario":
		itens, erro = repo.ComentariosPorUsuario(consulta)
	case "categoria":
		itens, erro = repo.ComentariosPorCategoria(consulta)
	default:
		respostas.Erro(w, http.StatusBadRequest, errors.New("tipo inválido: use livro, usuario ou categoria"))
		return
	}

	if erro != nil {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}

	if itens == nil {
		itens = []modelos.ComentarioRelatorioItem{}
	}
	respostas.JSON(w, http.StatusOK, itens)
}

// AdminRelatorioLivros lista livros filtrados por autor, editora ou categoria.
func AdminRelatorioLivros(w http.ResponseWriter, r *http.Request) {
	consulta := consultaRelatorio(r)
	tipo := tipoRelatorio(r)

	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	repo := repositorios.NovoRepositorioDeRelatorios(db)
	var livros []modelos.Livro

	switch tipo {
	case "autor":
		livros, erro = repo.LivrosPorAutor(consulta)
	case "editora":
		livros, erro = repo.LivrosPorEditora(consulta)
	case "categoria":
		livros, erro = repo.LivrosPorCategoria(consulta)
	default:
		respostas.Erro(w, http.StatusBadRequest, errors.New("tipo inválido: use autor, editora ou categoria"))
		return
	}

	if erro != nil {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}

	if livros == nil {
		livros = []modelos.Livro{}
	}
	respostas.JSON(w, http.StatusOK, livros)
}

// AdminRelatorioSeguidoresSeguindo retorna seguidores e seguindo de um leitor.
func AdminRelatorioSeguidoresSeguindo(w http.ResponseWriter, r *http.Request) {
	consulta := consultaRelatorio(r)

	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	repoUsuarios := repositorios.NovoRepositorioDeUsuarios(db)
	usuario, erro := repoUsuarios.BuscarPorNickEmailOuID(consulta)
	if erro != nil {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}
	if usuario.ID == 0 {
		respostas.Erro(w, http.StatusNotFound, errors.New("Usuário não encontrado"))
		return
	}

	seguidores, erro := repoUsuarios.BuscarSeguidores(usuario.ID)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	seguindo, erro := repoUsuarios.BuscarSeguindo(usuario.ID)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	respostas.JSON(w, http.StatusOK, modelos.SeguidoresSeguindoRelatorio{
		Usuario:    modelos.UsuarioParaRelatorioResumo(usuario),
		Seguidores: usuariosParaResumo(seguidores),
		Seguindo:   usuariosParaResumo(seguindo),
	})
}

// AdminRelatorioHistoricoLeitura retorna o histórico de leitura de um leitor.
func AdminRelatorioHistoricoLeitura(w http.ResponseWriter, r *http.Request) {
	consulta := consultaRelatorio(r)
	limite := 100
	if l := r.URL.Query().Get("limite"); l != "" {
		if parsed, erro := strconv.Atoi(l); erro == nil && parsed > 0 {
			limite = parsed
		}
	}

	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	repoUsuarios := repositorios.NovoRepositorioDeUsuarios(db)
	usuario, erro := repoUsuarios.BuscarPorNickEmailOuID(consulta)
	if erro != nil {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}
	if usuario.ID == 0 {
		respostas.Erro(w, http.StatusNotFound, errors.New("Usuário não encontrado"))
		return
	}

	repoDiario := repositorios.NovoRepositorioDeDiario(db)
	historico, erro := repoDiario.BuscarHistorico(usuario.ID, limite)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	if historico == nil {
		historico = []modelos.DiarioHistoricoItem{}
	}

	respostas.JSON(w, http.StatusOK, modelos.HistoricoLeituraRelatorio{
		Usuario:   modelos.UsuarioParaRelatorioResumo(usuario),
		Historico: historico,
	})
}

func usuariosParaResumo(usuarios []modelos.Usuario) []modelos.UsuarioRelatorioResumo {
	resultado := make([]modelos.UsuarioRelatorioResumo, 0, len(usuarios))
	for _, usuario := range usuarios {
		resultado = append(resultado, modelos.UsuarioRelatorioResumo{
			ID:    usuario.ID,
			Nome:  usuario.Nome,
			Nick:  usuario.Nick,
			Image: usuario.Image,
		})
	}
	return resultado
}
