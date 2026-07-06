export const RELATORIOS = {
    "comentarios-livro": {
        titulo: "Comentários por Livro",
        subtitulo: "Insira o título ou ID do livro para abrir o relatório",
        placeholder: "Título ou ID do livro",
        apiTipo: "livro",
        apiCategoria: "comentarios",
    },
    "comentarios-usuario": {
        titulo: "Comentários por Usuário",
        subtitulo: "Insira o nome de usuário, e-mail ou ID do leitor para abrir o relatório",
        placeholder: "Nome de usuário, e-mail ou ID",
        apiTipo: "usuario",
        apiCategoria: "comentarios",
    },
    "comentarios-categoria": {
        titulo: "Comentários por Categoria",
        subtitulo: "Insira o nome ou ID da categoria para abrir o relatório",
        placeholder: "Nome ou ID da categoria",
        apiTipo: "categoria",
        apiCategoria: "comentarios",
    },
    "livros-autor": {
        titulo: "Listagem de Livros por Autor",
        subtitulo: "Insira o nome do autor para abrir o relatório",
        placeholder: "Nome do autor",
        apiTipo: "autor",
        apiCategoria: "livros",
    },
    "livros-editora": {
        titulo: "Listagem de Livros por Editora",
        subtitulo: "Insira o nome da editora para abrir o relatório",
        placeholder: "Nome da editora",
        apiTipo: "editora",
        apiCategoria: "livros",
    },
    "livros-categoria": {
        titulo: "Listagem de Livros por Categoria",
        subtitulo: "Insira o nome ou ID da categoria para abrir o relatório",
        placeholder: "Nome ou ID da categoria",
        apiTipo: "categoria",
        apiCategoria: "livros",
    },
    "seguidores-seguindo": {
        titulo: "Listagem de Seguidores e Seguindo do Leitor",
        subtitulo: "Insira o nome de usuário, e-mail ou ID do leitor para abrir o relatório",
        placeholder: "Nome de usuário, e-mail ou ID",
        apiCategoria: "seguidores-seguindo",
    },
    "historico-leitura": {
        titulo: "Histórico de Leitura do Leitor",
        subtitulo: "Insira o nome de usuário, e-mail ou ID do leitor para abrir o relatório",
        placeholder: "Nome de usuário, e-mail ou ID",
        apiCategoria: "historico-leitura",
    },
} as const;

export type RelatorioSlug = keyof typeof RELATORIOS;
