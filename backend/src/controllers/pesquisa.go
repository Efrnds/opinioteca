package controllers

import (
	"backend/src/banco"
	"backend/src/integracoes/googlebooks"
	"backend/src/modelos"
	"backend/src/repositorios"
	"backend/src/respostas"
	"net/http"
	"strconv"
	"strings"
	"sync"
)

func parseLimitePesquisa(r *http.Request) int {
	padrao := 20
	if valor := r.URL.Query().Get("limite"); valor != "" {
		if parsed, erro := strconv.Atoi(valor); erro == nil && parsed > 0 && parsed <= 50 {
			return parsed
		}
	}
	return padrao
}

func PesquisaGlobal(w http.ResponseWriter, r *http.Request) {
	termo := strings.TrimSpace(r.URL.Query().Get("q"))
	if termo == "" {
		respostas.JSON(w, http.StatusOK, modelos.PesquisaGlobalResponse{
			Usuarios: []modelos.UsuarioPesquisa{},
			Livros:   []modelos.LivroPesquisa{},
		})
		return
	}

	limite := parseLimitePesquisa(r)

	db, erro := banco.Conectar()
	if erro != nil {
		respostas.Erro(w, http.StatusInternalServerError, erro)
		return
	}
	defer db.Close()

	repoUsuarios := repositorios.NovoRepositorioDeUsuarios(db)
	repoLivros := repositorios.NovoRepositorioDeLivros(db)
	clientGoogle := googlebooks.NovoClient()

	var usuarios []modelos.UsuarioPesquisa
	var livrosLocais []modelos.LivroPesquisa
	var volumesGoogle []googlebooks.VolumeItem
	var errUsuarios, errLivros, errGoogle error

	var wg sync.WaitGroup
	wg.Add(3)

	go func() {
		defer wg.Done()
		usuarios, errUsuarios = repoUsuarios.PesquisarGlobal(termo, limite)
	}()

	go func() {
		defer wg.Done()
		livrosLocais, errLivros = repoLivros.PesquisarGlobal(termo, limite)
	}()

	go func() {
		defer wg.Done()
		volumesGoogle, errGoogle = clientGoogle.Buscar(termo, limite)
	}()

	wg.Wait()

	if errUsuarios != nil {
		respostas.Erro(w, http.StatusInternalServerError, errUsuarios)
		return
	}
	if errLivros != nil {
		respostas.Erro(w, http.StatusInternalServerError, errLivros)
		return
	}

	livros := mesclarLivrosPesquisa(livrosLocais, volumesGoogle, errGoogle, limite)

	respostas.JSON(w, http.StatusOK, modelos.PesquisaGlobalResponse{
		Usuarios: usuarios,
		Livros:   livros,
	})
}

func mesclarLivrosPesquisa(locais []modelos.LivroPesquisa, volumes []googlebooks.VolumeItem, errGoogle error, limite int) []modelos.LivroPesquisa {
	isbnsVistos := map[string]bool{}
	volumesVistos := map[string]bool{}
	resultado := make([]modelos.LivroPesquisa, 0, len(locais)+5)

	for _, l := range locais {
		resultado = append(resultado, l)
		if l.ISBN != "" {
			isbnsVistos[l.ISBN] = true
		}
		if l.GoogleVolumeID != "" {
			volumesVistos[l.GoogleVolumeID] = true
		}
	}

	if errGoogle == nil {
		for _, volume := range volumes {
			item, erro := googlebooks.VolumeParaLivroBusca(volume)
			if erro != nil {
				continue
			}
			if item.ISBN != "" && isbnsVistos[item.ISBN] {
				continue
			}
			if item.GoogleVolumeID != "" && volumesVistos[item.GoogleVolumeID] {
				continue
			}
			if item.ISBN != "" {
				isbnsVistos[item.ISBN] = true
			}
			if item.GoogleVolumeID != "" {
				volumesVistos[item.GoogleVolumeID] = true
			}
			resultado = append(resultado, modelos.LivroPesquisa{
				Titulo:         item.Titulo,
				Autor:          item.Autor,
				CapaURL:        item.CapaURL,
				GoogleVolumeID: item.GoogleVolumeID,
				ISBN:           item.ISBN,
			})
			if len(resultado) >= limite {
				break
			}
		}
	}

	if len(resultado) > limite {
		return resultado[:limite]
	}

	return resultado
}
