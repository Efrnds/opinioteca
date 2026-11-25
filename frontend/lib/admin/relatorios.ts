export type RelatorioTabId = "usuarios" | "avaliacoes" | "assinaturas" | "denuncias";
export type RelatorioTab = {
    id: RelatorioTabId;
    label: string;
    titulo: string;
    descricao: string;
    endpoint: string;
};
export const RELATORIO_TABS: RelatorioTab[] = [
    {
        id: "usuarios",
        label: "Usuários",
        titulo: "Relatório geral de usuários",
        descricao: "Visão consolidada da base de leitores: totais por status e plano, além da listagem filtrada de cadastros no período.",
        endpoint: "/api/admin/relatorios/pdf/usuarios",
    },
    {
        id: "avaliacoes",
        label: "Avaliações",
        titulo: "Relatório de avaliações",
        descricao: "Resumo das avaliações publicadas no período: volume, média de notas, distribuição e listagem detalhada.",
        endpoint: "/api/admin/relatorios/pdf/avaliacoes",
    },
    {
        id: "assinaturas",
        label: "Assinaturas",
        titulo: "Relatório de assinaturas",
        descricao: "Panorama das assinaturas pagas (OpinioTop e OpinioPro): ativas, expirando em 30 dias e expiradas.",
        endpoint: "/api/admin/relatorios/pdf/assinaturas",
    },
    {
        id: "denuncias",
        label: "Denúncias",
        titulo: "Relatório de denúncias",
        descricao: "Moderação: volume de denúncias por status e tipo de entidade, com listagem detalhada no período.",
        endpoint: "/api/admin/relatorios/pdf/denuncias",
    },
];
export type RelatorioFonte = "livros" | "usuarios" | "categorias" | "autores" | "editoras";
export const RELATORIOS = {
    "comentarios-livro": {
        titulo: "Comentários por Livro",
        subtitulo: "Selecione o livro para abrir o relatório",
        placeholder: "Selecione um livro",
        apiTipo: "livro",
        apiCategoria: "comentarios",
        fonte: "livros" as RelatorioFonte,
    },
    "comentarios-usuario": {
        titulo: "Comentários por Usuário",
        subtitulo: "Selecione o leitor para abrir o relatório",
        placeholder: "Selecione um usuário",
        apiTipo: "usuario",
        apiCategoria: "comentarios",
        fonte: "usuarios" as RelatorioFonte,
    },
    "comentarios-categoria": {
        titulo: "Comentários por Categoria",
        subtitulo: "Selecione a categoria para abrir o relatório",
        placeholder: "Selecione uma categoria",
        apiTipo: "categoria",
        apiCategoria: "comentarios",
        fonte: "categorias" as RelatorioFonte,
    },
    "livros-autor": {
        titulo: "Listagem de Livros por Autor",
        subtitulo: "Selecione o autor para abrir o relatório",
        placeholder: "Selecione um autor",
        apiTipo: "autor",
        apiCategoria: "livros",
        fonte: "autores" as RelatorioFonte,
    },
    "livros-editora": {
        titulo: "Listagem de Livros por Editora",
        subtitulo: "Selecione a editora para abrir o relatório",
        placeholder: "Selecione uma editora",
        apiTipo: "editora",
        apiCategoria: "livros",
        fonte: "editoras" as RelatorioFonte,
    },
    "livros-categoria": {
        titulo: "Listagem de Livros por Categoria",
        subtitulo: "Selecione a categoria para abrir o relatório",
        placeholder: "Selecione uma categoria",
        apiTipo: "categoria",
        apiCategoria: "livros",
        fonte: "categorias" as RelatorioFonte,
    },
    "seguidores-seguindo": {
        titulo: "Listagem de Seguidores e Seguindo do Leitor",
        subtitulo: "Selecione o leitor para abrir o relatório",
        placeholder: "Selecione um usuário",
        apiCategoria: "seguidores-seguindo",
        fonte: "usuarios" as RelatorioFonte,
    },
    "historico-leitura": {
        titulo: "Histórico de Leitura do Leitor",
        subtitulo: "Selecione o leitor para abrir o relatório",
        placeholder: "Selecione um usuário",
        apiCategoria: "historico-leitura",
        fonte: "usuarios" as RelatorioFonte,
    },
} as const;
export type RelatorioSlug = keyof typeof RELATORIOS;
export type RelatorioOpcao = {
    value: string;
    label: string;
};
