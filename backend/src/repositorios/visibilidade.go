package repositorios

import (
	"backend/src/modelos"
	"database/sql"
)

// PodeVerConteudoDoPerfil retorna true se o viewer pode ver avaliações/comentários
// do dono (público, dono, ou seguidor de perfil privado).
func PodeVerConteudoDoPerfil(db *sql.DB, viewerID, donoID uint64) (bool, error) {
	if donoID == 0 {
		return false, nil
	}
	if viewerID != 0 && viewerID == donoID {
		return true, nil
	}

	config, erro := NovoRepositorioDeConfiguracoes(db).BuscarOuCriar(donoID)
	if erro != nil {
		return false, erro
	}
	if config.VisibilidadePerfil != modelos.VisibilidadePrivado {
		return true, nil
	}

	return NovoRepositorioDeUsuarios(db).Segue(viewerID, donoID)
}

const joinConfigVisibilidade = `
 LEFT JOIN usuario_configuracoes uc ON uc.usuario_id = a.usuario_id`

// condicaoVisibilidadePerfil usa o placeholder informado (ex.: "$1") para o viewerID.
func condicaoVisibilidadePerfil(paramViewer string) string {
	return `(
   COALESCE(uc.visibilidade_perfil, 'publico') = 'publico'
   OR a.usuario_id = ` + paramViewer + `
   OR (` + paramViewer + ` <> 0 AND EXISTS (
     SELECT 1 FROM seguidores s
     WHERE s.id_seguidor = ` + paramViewer + ` AND s.id_seguido = a.usuario_id
   ))
 )`
}
