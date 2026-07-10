export type RelatorioTabId =
    | "usuarios"
    | "avaliacoes"
    | "assinaturas"
    | "denuncias"
    | "comentarios"
    | "livros"
    | "leitor";

export type RelatorioTab = {
    id: RelatorioTabId;
    label: string;
    titulo: string;
    descricao: string;
    endpoint: string;
    requerConsulta?: boolean;
};

export const RELATORIO_TABS: RelatorioTab[] = [
    {
        id: "usuarios",
        label: "Usuários",
        titulo: "Relatório geral de usuários",
        descricao:
            "Visão consolidada da base de leitores: totais por status e plano, além da listagem filtrada de cadastros no período.",
        endpoint: "/api/admin/relatorios/pdf/usuarios",
    },
    {
        id: "avaliacoes",
        label: "Avaliações",
        titulo: "Relatório de avaliações",
        descricao:
            "Resumo das resenhas publicadas no período: volume, média de notas, distribuição e listagem detalhada.",
        endpoint: "/api/admin/relatorios/pdf/avaliacoes",
    },
    {
        id: "assinaturas",
        label: "Assinaturas",
        titulo: "Relatório de assinaturas",
        descricao:
            "Panorama das assinaturas pagas (OpinioTop e OpinioPro): ativas, expirando em 30 dias e expiradas.",
        endpoint: "/api/admin/relatorios/pdf/assinaturas",
    },
    {
        id: "denuncias",
        label: "Denúncias",
        titulo: "Relatório de denúncias",
        descricao:
            "Moderação: volume de denúncias por status e tipo de entidade, com listagem detalhada no período.",
        endpoint: "/api/admin/relatorios/pdf/denuncias",
    },
    {
        id: "comentarios",
        label: "Comentários",
        titulo: "Comentários (consulta específica)",
        descricao:
            "Listagem de comentários filtrados por livro, usuário ou categoria — o mesmo relatório específico de antes, agora em PDF.",
        endpoint: "/api/admin/relatorios/pdf/comentarios",
        requerConsulta: true,
    },
    {
        id: "livros",
        label: "Livros",
        titulo: "Livros (consulta específica)",
        descricao:
            "Listagem de livros filtrados por autor, editora ou categoria — relatório específico em PDF.",
        endpoint: "/api/admin/relatorios/pdf/livros",
        requerConsulta: true,
    },
    {
        id: "leitor",
        label: "Leitor",
        titulo: "Relatórios por leitor",
        descricao:
            "Gera PDF de seguidores/seguindo ou do histórico de leitura de um leitor específico.",
        endpoint: "",
        requerConsulta: true,
    },
];

/** Mantido para a página legada /admin/relatorios/[slug] e deep-links. */
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
