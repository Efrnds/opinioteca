export type Notificacao = {
    id: number;
    usuario_id: number;
    tipo_notificacao: "avaliacao" | "comentario" | "seguidor" | "mensagem" | "voto_avaliacao";
    titulo: string;
    conteudo: string;
    referencia_id?: number;
    lida: boolean;
    criado_em: string;
};
