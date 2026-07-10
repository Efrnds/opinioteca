export type TemplateAvaliacao = {
    id: number;
    nome: string;
    descricao: string;
    texto: string;
};

export type TemplateEstrutura = {
    descricao: string;
    texto: string;
};

export type TemplateAdmin = {
    id: number;
    nome: string;
    assinatura_minima_id: number;
    estrutura_json: TemplateEstrutura;
    ativo: boolean;
    ordem: number;
    criado_em: string;
    assinatura_minima_nome?: string;
    assinatura_minima_codigo?: string;
};

export type TemplateAdminPayload = {
    nome: string;
    descricao: string;
    texto: string;
    assinatura_minima_id: number;
    ativo?: boolean;
    ordem?: number;
};

export function previewTemplate(texto: string, max = 80) {
    const limpo = texto.replace(/\s+/g, " ").trim();
    if (limpo.length <= max) return limpo;
    return `${limpo.slice(0, max)}…`;
}
