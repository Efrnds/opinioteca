export type PesquisaUsuario = {
    id: number;
    nome: string;
    nick: string;
    image?: string;
};

export type PesquisaLivro = {
    id?: number;
    titulo: string;
    autor: string;
    capa_url?: string;
    google_volume_id?: string;
    isbn?: string;
};

export type PesquisaResultado = {
    usuarios: PesquisaUsuario[];
    livros: PesquisaLivro[];
};

export function hrefLivroPesquisa(livro: PesquisaLivro): string {
    if (livro.id) return `/livros/${livro.id}`;
    if (livro.google_volume_id) return `/livros/pesquisa/${livro.google_volume_id}`;
    return "#";
}

export function keyLivroPesquisa(livro: PesquisaLivro, index: number): string {
    return String(livro.id || livro.google_volume_id || index);
}
