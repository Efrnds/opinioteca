package googlebooks

func extrairPaginas(info volumeInfo) int {
	if info.PageCount > 0 {
		return info.PageCount
	}
	if info.PrintedPageCount > 0 {
		return info.PrintedPageCount
	}
	return 0
}

// EnriquecerPaginas completa pageCount quando a busca retorna 0 mas o volume detalhado ou ISBN tem o dado.
func (c *Client) EnriquecerPaginas(item VolumeItem) (VolumeItem, error) {
	if extrairPaginas(item.VolumeInfo) > 0 {
		item.VolumeInfo.PageCount = extrairPaginas(item.VolumeInfo)
		return item, nil
	}

	detalhe, erro := c.BuscarPorVolumeID(item.ID)
	if erro == nil {
		if paginas := extrairPaginas(detalhe.VolumeInfo); paginas > 0 {
			item.VolumeInfo.PageCount = paginas
			return item, nil
		}
		if item.VolumeInfo.Publisher == "" && detalhe.VolumeInfo.Publisher != "" {
			item.VolumeInfo.Publisher = detalhe.VolumeInfo.Publisher
		}
		if item.VolumeInfo.Description == "" && detalhe.VolumeInfo.Description != "" {
			item.VolumeInfo.Description = detalhe.VolumeInfo.Description
		}
		if item.VolumeInfo.ImageLinks.Thumbnail == "" && detalhe.VolumeInfo.ImageLinks.Thumbnail != "" {
			item.VolumeInfo.ImageLinks = detalhe.VolumeInfo.ImageLinks
		}
	}

	isbn := extrairISBN(item.VolumeInfo.IndustryIdentifiers)
	if isbn == "" {
		return item, nil
	}

	resultados, erro := c.Buscar("isbn:"+isbn, 3)
	if erro != nil {
		return item, nil
	}

	for _, candidato := range resultados {
		if paginas := extrairPaginas(candidato.VolumeInfo); paginas > 0 {
			item.VolumeInfo.PageCount = paginas
			return item, nil
		}
	}

	return item, nil
}
