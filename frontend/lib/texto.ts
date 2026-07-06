/** Detecta URLs em texto (http, https, www). */
export const LINK_REGEX = /(https?:\/\/|www\.)[^\s]+/i;

export function textoContemLink(texto: string): boolean {
    return LINK_REGEX.test(texto.trim());
}
