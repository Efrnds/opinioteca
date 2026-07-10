import { mediaUrl } from "@/lib/media";

export type CategoriaLivro = {

    id: number;

    nome_categoria: string;

};



export type DadosLivroForm = {

    livro_id?: number;

    google_volume_id?: string;

    titulo: string;

    autor: string;

    paginas: string;

    capa_url: string;

    categorias_ids: number[];

};



export function dadosDeLivroBusca(livro: {

    id?: number;

    google_volume_id?: string;

    titulo: string;

    autor: string;

    paginas?: number;

    capa_url?: string;

    categoria_id?: number;

    categorias_ids?: number[];

}): DadosLivroForm {

    const categoriasIds =

        livro.categorias_ids && livro.categorias_ids.length > 0

            ? livro.categorias_ids

            : livro.categoria_id

              ? [livro.categoria_id]

              : [];



    return {

        livro_id: livro.id,

        google_volume_id: livro.google_volume_id,

        titulo: livro.titulo ?? "",

        autor: livro.autor ?? "",

        paginas: livro.paginas ? String(livro.paginas) : "",

        capa_url: mediaUrl(livro.capa_url) ?? livro.capa_url ?? "",

        categorias_ids: categoriasIds,

    };

}



export function dadosLivroVazios(tituloSugerido = ""): DadosLivroForm {

    return {

        titulo: tituloSugerido,

        autor: "",

        paginas: "",

        capa_url: "",

        categorias_ids: [],

    };

}



export function livroPrecisaCadastro(dados: DadosLivroForm) {

    return !dados.livro_id;

}



export function montarPayloadLivro(dados: DadosLivroForm) {

    const payload: {

        titulo: string;

        autor: string;

        livro_id?: number;

        google_volume_id?: string;

        capa_url?: string;

        paginas?: number;

        categorias_ids?: number[];

        categoria_id?: number;

    } = {

        titulo: dados.titulo.trim(),

        autor: dados.autor.trim(),

    };



    if (dados.livro_id) payload.livro_id = dados.livro_id;

    if (dados.google_volume_id) payload.google_volume_id = dados.google_volume_id;

    if (dados.capa_url.trim()) payload.capa_url = dados.capa_url.trim();

    if (dados.paginas.trim()) {

        const paginas = Number(dados.paginas);

        if (!Number.isNaN(paginas) && paginas > 0) {

            payload.paginas = paginas;

        }

    }

    if (dados.categorias_ids.length > 0) {

        payload.categorias_ids = dados.categorias_ids;

        payload.categoria_id = dados.categorias_ids[0];

    }



    return payload;

}



export async function registrarLivroUsuario(dados: DadosLivroForm): Promise<number> {

    if (dados.livro_id) {

        return dados.livro_id;

    }



    const res = await fetch("/api/livros", {

        method: "POST",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify(montarPayloadLivro(dados)),

    });

    const data = await res.json();



    if (!res.ok) {

        throw new Error(data.erro || "Não foi possível salvar o livro.");

    }

    if (!data.id) {

        throw new Error("Resposta inválida ao salvar o livro.");

    }



    return data.id as number;

}


