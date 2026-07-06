export type UsuarioAdmin = {
    id: number;
    nome: string;
    nick: string;
    email: string;
    image?: string;
    criadoEm: string;
    rankConfiabilidade: number;
    assinaturaId: number;
    sequenciaAtual: number;
    maiorSequencia: number;
    modoZen: boolean;
    status: string;
    isAdmin: boolean;
};

export type LivroAdmin = {
    id: number;
    isbn?: string;
    titulo: string;
    editora?: string;
    categoria_id: number;
    categorias_ids?: number[];
    status: string;
    paginas: number;
    autor: string;
    sinopse?: string;
    capa_url?: string;
    data_publicacao?: string;
    google_volume_id?: string;
    origem: string;
    criado_em: string;
};

export type CategoriaAdmin = {
    id: number;
    nome_categoria: string;
    ativo: boolean;
    criado_em: string;
};

export type ComentarioRelatorio = {
    id: number;
    texto: string;
    criadoEm: string;
    usuario_nome: string;
    usuario_nick: string;
    livro_titulo: string;
    categoria_nome: string;
    avaliacao_id: number;
};

export type UsuarioRelatorioResumo = {
    id: number;
    nome: string;
    nick: string;
    email: string;
    image?: string;
};

export type SeguidoresSeguindoRelatorio = {
    usuario: UsuarioRelatorioResumo;
    seguidores: UsuarioRelatorioResumo[];
    seguindo: UsuarioRelatorioResumo[];
};

export type HistoricoLeituraRelatorio = {
    usuario: UsuarioRelatorioResumo;
    historico: {
        id: number;
        livro_id: number;
        paginas_lidas: number;
        porcentagem_leitura: number;
        data_registro: string;
        livro: {
            id: number;
            titulo: string;
            autor: string;
            capa_url?: string;
        };
    }[];
};

export type CriarUsuarioAdminPayload = {
    nome: string;
    nick: string;
    email: string;
    senha: string;
    isAdmin?: boolean;
};

export type AtualizarUsuarioAdminPayload = {
    nome?: string;
    nick?: string;
    email?: string;
    status?: string;
    isAdmin?: boolean;
};
