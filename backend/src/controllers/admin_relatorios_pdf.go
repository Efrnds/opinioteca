package controllers

import (
	"backend/src/banco"
	"backend/src/modelos"
	"backend/src/pdf"
	"backend/src/repositorios"
	"backend/src/respostas"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"
)

func parseDataQuery(valor string) (*time.Time, error) {
	valor = strings.TrimSpace(valor)
	if valor == "" {
		return nil, nil
	}
	t, erro := time.ParseInLocation("2006-01-02", valor, time.FixedZone("BRT", -3*3600))
	if erro != nil {
		return nil, fmt.Errorf("data inválida: %s (use AAAA-MM-DD)", valor)
	}
	return &t, nil
}

func periodoDaRequest(r *http.Request) (repositorios.FiltroPeriodo, []string, error) {
	de, erro := parseDataQuery(r.URL.Query().Get("de"))
	if erro != nil {
		return repositorios.FiltroPeriodo{}, nil, erro
	}
	ate, erro := parseDataQuery(r.URL.Query().Get("ate"))
	if erro != nil {
		return repositorios.FiltroPeriodo{}, nil, erro
	}
	filtros := []string{}
	if de != nil {
		filtros = append(filtros, "De: "+de.Format("02/01/2006"))
	}
	if ate != nil {
		filtros = append(filtros, "Até: "+ate.Format("02/01/2006"))
	}
	return repositorios.FiltroPeriodo{De: de, Ate: ate}, filtros, nil
}

func escreverPDF(w http.ResponseWriter, doc *pdf.Documento) {
	if erro := doc.Escrever(w); erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
	}
}

func labelOuTodos(valor, todos string) string {
	if strings.TrimSpace(valor) == "" {
		return todos
	}
	return valor
}

func expiraTexto(t *time.Time, vitalicia bool) string {
	if vitalicia || t == nil {
		return "Vitalícia"
	}
	return pdf.FormatDataCurta(*t)
}

func simNao(v bool) string {
	if v {
		return "Sim"
	}
	return "Não"
}

// AdminRelatorioPDFUsuarios gera PDF geral de usuários.
func AdminRelatorioPDFUsuarios(w http.ResponseWriter, r *http.Request) {
	periodo, filtrosPeriodo, erro := periodoDaRequest(r)
	if erro != nil {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}
	status := strings.TrimSpace(r.URL.Query().Get("status"))
	plano := strings.TrimSpace(r.URL.Query().Get("plano"))

	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	dados, erro := repositorios.NovoRepositorioDeRelatorios(db).RelatorioUsuarios(status, plano, periodo)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	filtros := append([]string{}, filtrosPeriodo...)
	filtros = append(filtros, "Status: "+labelOuTodos(status, "todos"))
	filtros = append(filtros, "Plano: "+labelOuTodos(plano, "todos"))

	doc := pdf.Novo(pdf.Meta{
		Titulo:      "Relatório geral de usuários",
		Descricao:   "Visão consolidada da base de leitores: totais por status e plano, além da listagem filtrada de cadastros no período.",
		Filtros:     filtros,
		NomeArquivo: "relatorio-usuarios.pdf",
	})

	doc.Secao("Resumo")
	doc.ResumoLinha("Total (filtro atual)", strconv.Itoa(dados.Total))
	for _, c := range dados.PorStatus {
		doc.ResumoLinha("Status "+c.Rotulo, strconv.Itoa(c.Total))
	}
	for _, c := range dados.PorPlano {
		doc.ResumoLinha("Plano "+c.Rotulo, strconv.Itoa(c.Total))
	}

	doc.Secao("Usuários")
	if len(dados.Usuarios) == 0 {
		doc.Vazio("Nenhum usuário encontrado com os filtros informados.")
	} else {
		linhas := make([][]string, 0, len(dados.Usuarios))
		for _, u := range dados.Usuarios {
			linhas = append(linhas, []string{
				strconv.FormatUint(u.ID, 10),
				u.Nome,
				"@" + u.Nick,
				u.Status,
				u.PlanoNome,
				simNao(u.IsAdmin),
				pdf.FormatDataCurta(u.CriadoEm),
			})
		}
		doc.Tabela(
			[]float64{12, 40, 28, 18, 24, 14, 26},
			[]string{"ID", "Nome", "Nick", "Status", "Plano", "Admin", "Criado em"},
			linhas,
		)
	}

	escreverPDF(w, doc)
}

// AdminRelatorioPDFAvaliacoes gera PDF geral de avaliações.
func AdminRelatorioPDFAvaliacoes(w http.ResponseWriter, r *http.Request) {
	periodo, filtrosPeriodo, erro := periodoDaRequest(r)
	if erro != nil {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}
	spoiler := strings.TrimSpace(r.URL.Query().Get("spoiler"))

	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	dados, erro := repositorios.NovoRepositorioDeRelatorios(db).RelatorioAvaliacoes(periodo, spoiler)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	filtros := append([]string{}, filtrosPeriodo...)
	switch spoiler {
	case "sim":
		filtros = append(filtros, "Spoiler: apenas com spoiler")
	case "nao":
		filtros = append(filtros, "Spoiler: apenas sem spoiler")
	default:
		filtros = append(filtros, "Spoiler: todos")
	}

	doc := pdf.Novo(pdf.Meta{
		Titulo:      "Relatório de avaliações",
		Descricao:   "Resumo das avaliações publicadas no período: volume, média de notas, distribuição e listagem detalhada.",
		Filtros:     filtros,
		NomeArquivo: "relatorio-avaliacoes.pdf",
	})

	doc.Secao("Resumo")
	doc.ResumoLinha("Total de avaliações", strconv.Itoa(dados.Total))
	doc.ResumoLinha("Média de notas", fmt.Sprintf("%.2f", dados.MediaNota))
	doc.ResumoLinha("Com spoiler", strconv.Itoa(dados.ComSpoiler))
	for _, c := range dados.PorNota {
		doc.ResumoLinha(c.Rotulo, strconv.Itoa(c.Total))
	}

	doc.Secao("Avaliações")
	if len(dados.Avaliacoes) == 0 {
		doc.Vazio("Nenhuma avaliação encontrada com os filtros informados.")
	} else {
		linhas := make([][]string, 0, len(dados.Avaliacoes))
		for _, a := range dados.Avaliacoes {
			linhas = append(linhas, []string{
				strconv.FormatUint(a.ID, 10),
				strconv.Itoa(a.Nota),
				"@" + a.UsuarioNick,
				a.LivroTitulo,
				simNao(a.ContemSpoiler),
				pdf.FormatData(a.CriadoEm),
			})
		}
		doc.Tabela(
			[]float64{14, 12, 28, 70, 18, 30},
			[]string{"ID", "Nota", "Autor", "Livro", "Spoiler", "Data"},
			linhas,
		)
	}

	escreverPDF(w, doc)
}

// AdminRelatorioPDFAssinaturas gera PDF de assinaturas pagas.
func AdminRelatorioPDFAssinaturas(w http.ResponseWriter, r *http.Request) {
	plano := strings.TrimSpace(r.URL.Query().Get("plano"))
	filtro := strings.TrimSpace(r.URL.Query().Get("filtro"))
	if filtro == "" {
		filtro = "todas"
	}

	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	dados, erro := repositorios.NovoRepositorioDeRelatorios(db).RelatorioAssinaturas(plano, filtro)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	filtros := []string{
		"Plano: " + labelOuTodos(plano, "todos (pagos)"),
		"Situação: " + filtro,
	}

	doc := pdf.Novo(pdf.Meta{
		Titulo:      "Relatório de assinaturas",
		Descricao:   "Panorama das assinaturas pagas (OpinioTop e OpinioPro): ativas, expirando em 30 dias e expiradas.",
		Filtros:     filtros,
		NomeArquivo: "relatorio-assinaturas.pdf",
	})

	doc.Secao("Resumo geral")
	doc.ResumoLinha("Assinaturas ativas", strconv.Itoa(dados.Ativas))
	doc.ResumoLinha("Expirando em 30 dias", strconv.Itoa(dados.Expirando))
	doc.ResumoLinha("Expiradas", strconv.Itoa(dados.Expiradas))
	doc.ResumoLinha("Total no filtro", strconv.Itoa(dados.Total))
	for _, c := range dados.PorPlano {
		doc.ResumoLinha("Plano "+c.Rotulo, strconv.Itoa(c.Total))
	}

	doc.Secao("Assinantes")
	if len(dados.Itens) == 0 {
		doc.Vazio("Nenhuma assinatura encontrada com os filtros informados.")
	} else {
		linhas := make([][]string, 0, len(dados.Itens))
		for _, item := range dados.Itens {
			linhas = append(linhas, []string{
				strconv.FormatUint(item.ID, 10),
				item.Nome,
				"@" + item.Nick,
				item.PlanoNome,
				expiraTexto(item.ExpiraEm, item.Vitalicia),
				item.Status,
			})
		}
		doc.Tabela(
			[]float64{12, 42, 30, 28, 30, 20},
			[]string{"ID", "Nome", "Nick", "Plano", "Expira em", "Status"},
			linhas,
		)
	}

	escreverPDF(w, doc)
}

// AdminRelatorioPDFDenuncias gera PDF de denúncias.
func AdminRelatorioPDFDenuncias(w http.ResponseWriter, r *http.Request) {
	periodo, filtrosPeriodo, erro := periodoDaRequest(r)
	if erro != nil {
		respostas.Erro(w, http.StatusBadRequest, erro)
		return
	}
	status := strings.TrimSpace(r.URL.Query().Get("status"))
	tipo := strings.TrimSpace(r.URL.Query().Get("tipo"))

	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	dados, erro := repositorios.NovoRepositorioDeRelatorios(db).RelatorioDenuncias(status, tipo, periodo)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	filtros := append([]string{}, filtrosPeriodo...)
	filtros = append(filtros, "Status: "+labelOuTodos(status, "todos"))
	filtros = append(filtros, "Tipo: "+labelOuTodos(tipo, "todos"))

	doc := pdf.Novo(pdf.Meta{
		Titulo:      "Relatório de denúncias",
		Descricao:   "Moderação: volume de denúncias por status e tipo de entidade, com listagem detalhada no período.",
		Filtros:     filtros,
		NomeArquivo: "relatorio-denuncias.pdf",
	})

	doc.Secao("Resumo")
	doc.ResumoLinha("Total", strconv.Itoa(dados.Total))
	for _, c := range dados.PorStatus {
		doc.ResumoLinha("Status "+c.Rotulo, strconv.Itoa(c.Total))
	}
	for _, c := range dados.PorTipo {
		doc.ResumoLinha("Tipo "+c.Rotulo, strconv.Itoa(c.Total))
	}

	doc.Secao("Denúncias")
	if len(dados.Itens) == 0 {
		doc.Vazio("Nenhuma denúncia encontrada com os filtros informados.")
	} else {
		linhas := make([][]string, 0, len(dados.Itens))
		for _, d := range dados.Itens {
			linhas = append(linhas, []string{
				strconv.FormatUint(d.ID, 10),
				d.TipoEntidade,
				strconv.FormatUint(d.ReferenciaID, 10),
				d.Motivo,
				d.Status,
				"@" + d.DenuncianteNick,
				pdf.FormatData(d.CriadoEm),
			})
		}
		doc.Tabela(
			[]float64{12, 24, 18, 28, 24, 30, 26},
			[]string{"ID", "Tipo", "Ref.", "Motivo", "Status", "Denunciante", "Data"},
			linhas,
		)
	}

	escreverPDF(w, doc)
}

// AdminRelatorioPDFComentarios gera PDF dos comentários filtrados (relatório específico).
func AdminRelatorioPDFComentarios(w http.ResponseWriter, r *http.Request) {
	consulta := consultaRelatorio(r)
	tipo := tipoRelatorio(r)
	if strings.TrimSpace(consulta) == "" {
		respostas.Erro(w, http.StatusBadRequest, errors.New("informe a consulta (q)"))
		return
	}

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

	doc := pdf.Novo(pdf.Meta{
		Titulo:      "Relatório de comentários",
		Descricao:   "Listagem específica de comentários filtrados por livro, usuário ou categoria.",
		Filtros:     []string{"Tipo: " + tipo, "Consulta: " + consulta},
		NomeArquivo: "relatorio-comentarios.pdf",
	})

	if len(itens) == 0 {
		doc.Vazio("Nenhum comentário encontrado.")
	} else {
		linhas := make([][]string, 0, len(itens))
		for _, c := range itens {
			linhas = append(linhas, []string{
				strconv.FormatUint(c.ID, 10),
				"@" + c.UsuarioNick,
				c.LivroTitulo,
				c.CategoriaNome,
				c.Texto,
				pdf.FormatData(c.CriadoEm),
			})
		}
		doc.Tabela(
			[]float64{12, 26, 40, 28, 48, 28},
			[]string{"ID", "Autor", "Livro", "Categoria", "Texto", "Data"},
			linhas,
		)
	}

	escreverPDF(w, doc)
}

// AdminRelatorioPDFLivros gera PDF de livros filtrados (relatório específico).
func AdminRelatorioPDFLivros(w http.ResponseWriter, r *http.Request) {
	consulta := consultaRelatorio(r)
	tipo := tipoRelatorio(r)
	if strings.TrimSpace(consulta) == "" {
		respostas.Erro(w, http.StatusBadRequest, errors.New("informe a consulta (q)"))
		return
	}

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

	doc := pdf.Novo(pdf.Meta{
		Titulo:      "Relatório de livros",
		Descricao:   "Listagem específica de livros filtrados por autor, editora ou categoria.",
		Filtros:     []string{"Tipo: " + tipo, "Consulta: " + consulta},
		NomeArquivo: "relatorio-livros.pdf",
	})

	if len(livros) == 0 {
		doc.Vazio("Nenhum livro encontrado.")
	} else {
		linhas := make([][]string, 0, len(livros))
		for _, l := range livros {
			linhas = append(linhas, []string{
				strconv.FormatUint(l.ID, 10),
				l.Titulo,
				l.Autor,
				l.Editora,
				l.Status,
			})
		}
		doc.Tabela(
			[]float64{14, 60, 40, 40, 28},
			[]string{"ID", "Título", "Autor", "Editora", "Status"},
			linhas,
		)
	}

	escreverPDF(w, doc)
}

// AdminRelatorioPDFSeguidoresSeguindo gera PDF de seguidores/seguindo de um leitor.
func AdminRelatorioPDFSeguidoresSeguindo(w http.ResponseWriter, r *http.Request) {
	consulta := consultaRelatorio(r)
	if strings.TrimSpace(consulta) == "" {
		respostas.Erro(w, http.StatusBadRequest, errors.New("informe a consulta (q)"))
		return
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
		respostas.Erro(w, http.StatusNotFound, errors.New("usuário não encontrado"))
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

	doc := pdf.Novo(pdf.Meta{
		Titulo:      "Seguidores e seguindo",
		Descricao:   "Rede social do leitor: quem o segue e quem ele segue.",
		Filtros:     []string{"Leitor: " + usuario.Nome + " (@" + usuario.Nick + ")"},
		NomeArquivo: "relatorio-seguidores.pdf",
	})

	doc.Secao(fmt.Sprintf("Seguidores (%d)", len(seguidores)))
	if len(seguidores) == 0 {
		doc.Vazio("Nenhum seguidor.")
	} else {
		linhas := make([][]string, 0, len(seguidores))
		for _, u := range seguidores {
			linhas = append(linhas, []string{strconv.FormatUint(u.ID, 10), u.Nome, "@" + u.Nick})
		}
		doc.Tabela([]float64{20, 80, 82}, []string{"ID", "Nome", "Nick"}, linhas)
	}

	doc.Secao(fmt.Sprintf("Seguindo (%d)", len(seguindo)))
	if len(seguindo) == 0 {
		doc.Vazio("Não segue ninguém.")
	} else {
		linhas := make([][]string, 0, len(seguindo))
		for _, u := range seguindo {
			linhas = append(linhas, []string{strconv.FormatUint(u.ID, 10), u.Nome, "@" + u.Nick})
		}
		doc.Tabela([]float64{20, 80, 82}, []string{"ID", "Nome", "Nick"}, linhas)
	}

	escreverPDF(w, doc)
}

// AdminRelatorioPDFHistoricoLeitura gera PDF do histórico de leitura de um leitor.
func AdminRelatorioPDFHistoricoLeitura(w http.ResponseWriter, r *http.Request) {
	consulta := consultaRelatorio(r)
	if strings.TrimSpace(consulta) == "" {
		respostas.Erro(w, http.StatusBadRequest, errors.New("informe a consulta (q)"))
		return
	}
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
		respostas.Erro(w, http.StatusNotFound, errors.New("usuário não encontrado"))
		return
	}

	historico, erro := repositorios.NovoRepositorioDeDiario(db).BuscarHistorico(usuario.ID, limite)
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}

	doc := pdf.Novo(pdf.Meta{
		Titulo:    "Histórico de leitura",
		Descricao: "Registros do diário de leitura do leitor selecionado.",
		Filtros: []string{
			"Leitor: " + usuario.Nome + " (@" + usuario.Nick + ")",
			fmt.Sprintf("Limite: %d registros", limite),
		},
		NomeArquivo: "relatorio-historico-leitura.pdf",
	})

	if len(historico) == 0 {
		doc.Vazio("Nenhum registro de leitura encontrado.")
	} else {
		linhas := make([][]string, 0, len(historico))
		for _, h := range historico {
			linhas = append(linhas, []string{
				h.Livro.Titulo,
				h.Livro.Autor,
				strconv.Itoa(h.PaginasLidas),
				fmt.Sprintf("%.1f%%", h.PorcentagemLeitura),
				pdf.FormatData(h.DataRegistro),
			})
		}
		doc.Tabela(
			[]float64{60, 40, 22, 20, 40},
			[]string{"Livro", "Autor", "Páginas", "%", "Data"},
			linhas,
		)
	}

	escreverPDF(w, doc)
}
