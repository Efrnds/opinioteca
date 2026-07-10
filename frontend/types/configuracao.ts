export type NivelPrivacidade = "todos" | "seguidores" | "ninguem";
export type VisibilidadePerfil = "publico" | "privado";
export type TemaAparencia = "claro" | "escuro" | "leitor" | "custom" | "daltonismo";
export type DaltonismoTipo = "protanopia" | "deuteranopia" | "tritanopia" | "acromatopsia";
export type CorDestaquePreset = "azul" | "verde" | "rosa" | "roxo" | "laranja" | "amarelo";

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
    tema: TemaAparencia;
    daltonismoTipo: DaltonismoTipo;
    corDestaque: string;
    corFundoTexto: string | null;
    corSuperficie: string | null;
    corTexto: string | null;
    corHover: string | null;
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
    tema: "claro",
    daltonismoTipo: "deuteranopia",
    corDestaque: "azul",
    corFundoTexto: null,
    corSuperficie: null,
    corTexto: null,
    corHover: null,
};

export const OPCOES_PRIVACIDADE: { value: NivelPrivacidade; label: string }[] = [
    { value: "todos", label: "Todos" },
    { value: "seguidores", label: "Seguidores" },
    { value: "ninguem", label: "Ninguém" },
];
