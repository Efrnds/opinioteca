export type LivroUrlParams = {
    id?: number;
    google_volume_id?: string;
};

export function hrefLivro({ id, google_volume_id }: LivroUrlParams): string {
    if (google_volume_id) {
        return `/livros/${encodeURIComponent(google_volume_id)}`;
    }
    if (id != null) {
        return `/livros/${id}`;
    }
    return "#";
}

export function livroRegistrado(livro: { id?: number }): boolean {
    return livro.id != null && livro.id > 0;
}
