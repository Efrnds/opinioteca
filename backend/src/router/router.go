package router

import (
	"backend/src/config"
	"backend/src/router/rotas"
	"backend/src/upload"
	"log"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strings"

	"github.com/gorilla/mux"
)

func Gerar() *mux.Router {
	r := mux.NewRouter()
	uploadsFS := http.StripPrefix("/uploads/", http.FileServer(http.Dir(config.UploadsDir)))

	r.PathPrefix("/uploads/").Handler(http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
		rel := strings.TrimPrefix(req.URL.Path, "/uploads/")
		if strings.HasPrefix(rel, "avatars/") && strings.HasSuffix(rel, ".still.png") {
			prepararPreviewAvatarSobDemanda(rel)
		}
		w.Header().Set("X-Content-Type-Options", "nosniff")
		uploadsFS.ServeHTTP(w, req)
	}))

	return rotas.Configurar(r)
}

func prepararPreviewAvatarSobDemanda(rel string) {
	clean := path.Clean("/" + rel)
	if !strings.HasPrefix(clean, "/avatars/") || !strings.HasSuffix(clean, ".still.png") {
		return
	}

	previewRel := strings.TrimPrefix(clean, "/")
	previewPath := filepath.Join(config.UploadsDir, filepath.FromSlash(previewRel))
	if _, erro := os.Stat(previewPath); erro == nil {
		return
	}

	baseRel := strings.TrimSuffix(previewRel, ".still.png")
	candidatos := []string{
		baseRel + ".gif",
		baseRel + ".webp",
		baseRel + ".png",
		baseRel + ".jpg",
		baseRel + ".jpeg",
	}

	for _, candidatoRel := range candidatos {
		candidatoPath := filepath.Join(config.UploadsDir, filepath.FromSlash(candidatoRel))
		if _, erro := os.Stat(candidatoPath); erro != nil {
			continue
		}
		if erro := upload.GerarPreviewEstatico(candidatoPath, previewPath); erro != nil {
			log.Printf("falha ao gerar preview estático sob demanda (%s a partir de %s): %v", previewRel, candidatoRel, erro)
			continue
		}
		return
	}
}
