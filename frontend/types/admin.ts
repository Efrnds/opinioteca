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

export type DenunciaAdminListItem = {
    id: number;
    tipo_entidade: string;
    referencia_id: number;
    motivo: string;
    status: string;
    criado_em: string;
    denunciante_nick: string;
    denunciante_nome: string;
    denuncias_contra_usuario: number;
    denuncias_procedentes: number;
};

export type DenunciaAdminListagem = {
    itens: DenunciaAdminListItem[];
    pendentes: number;
};

export type DenunciaContextoAvaliacao = {
    id: number;
    texto: string;
    nota: number;
    autor_id: number;
    autor_nick: string;
    autor_nome: string;
};

export type DenunciaContextoComentario = {
    id: number;
    texto: string;
    avaliacao_id: number;
    autor_id: number;
    autor_nick: string;
    autor_nome: string;
};

export type DenunciaContextoUsuario = {
    id: number;
    nick: string;
    email: string;
    nome: string;
};

export type DenunciaContextoMensagem = {
    id: number;
    texto: string;
    remetente_id: number;
    remetente_nick: string;
    remetente_nome: string;
    criado_em: string;
};

export type DenunciaAdminDetalhe = {
    id: number;
    denunciante_id: number;
    tipo_entidade: string;
    referencia_id: number;
    motivo: string;
    descricao?: string;
    status: string;
    admin_id?: number;
    resolucao?: string;
    criado_em: string;
    resolvida_em?: string;
    denunciante_nick: string;
    denunciante_nome: string;
    denuncias_contra_usuario: number;
    denuncias_procedentes: number;
    contexto:
        | DenunciaContextoAvaliacao
        | DenunciaContextoComentario
        | DenunciaContextoUsuario
        | DenunciaContextoMensagem;
};

export type AcaoResolucaoDenuncia =
    | "rejeitar"
    | "remover_conteudo"
    | "advertir"
    | "inativar_usuario";
