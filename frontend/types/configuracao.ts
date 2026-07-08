export type NivelPrivacidade = "todos" | "seguidores" | "ninguem";
export type VisibilidadePerfil = "publico" | "privado";

export type ConfiguracaoUsuario = {
    usuarioId?: number;
    ocultarSpoilersPadrao: boolean;
    mostrarStreak: boolean;
    notifSeguidor: boolean;
    notifComentario: boolean;
    notifVotos: boolean;
    notifMensagens: boolean;
    mensagemDe: NivelPrivacidade;
    streakVisivelPara: NivelPrivacidade;
    historicoVisivelPara: NivelPrivacidade;
    visibilidadePerfil: VisibilidadePerfil;
    atualizadoEm?: string;
};

export const CONFIG_PADRAO: ConfiguracaoUsuario = {
    ocultarSpoilersPadrao: true,
    mostrarStreak: true,
    notifSeguidor: true,
    notifComentario: true,
    notifVotos: true,
    notifMensagens: true,
    mensagemDe: "todos",
    streakVisivelPara: "todos",
    historicoVisivelPara: "todos",
    visibilidadePerfil: "publico",
};

export const OPCOES_PRIVACIDADE: { value: NivelPrivacidade; label: string }[] = [
    { value: "todos", label: "Todos" },
    { value: "seguidores", label: "Seguidores" },
    { value: "ninguem", label: "Ninguém" },
];
