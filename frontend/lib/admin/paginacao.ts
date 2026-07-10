export const ADMIN_PAGE_SIZE = 20;

export type ListaPaginada<T> = {
    itens: T[];
    total: number;
    pagina: number;
    limite: number;
};

export function parseListaPaginada<T>(data: unknown): ListaPaginada<T> {
    if (Array.isArray(data)) {
        return {
            itens: data as T[],
            total: data.length,
            pagina: 1,
            limite: data.length || ADMIN_PAGE_SIZE,
        };
    }

    if (data && typeof data === "object") {
        const obj = data as Record<string, unknown>;
        const itens = Array.isArray(obj.itens) ? (obj.itens as T[]) : [];
        return {
            itens,
            total: typeof obj.total === "number" ? obj.total : itens.length,
            pagina: typeof obj.pagina === "number" ? obj.pagina : 1,
            limite: typeof obj.limite === "number" ? obj.limite : ADMIN_PAGE_SIZE,
        };
    }

    return { itens: [], total: 0, pagina: 1, limite: ADMIN_PAGE_SIZE };
}

export function paramsPaginacao(pagina: number, limite = ADMIN_PAGE_SIZE): URLSearchParams {
    const params = new URLSearchParams();
    params.set("pagina", String(pagina));
    params.set("limite", String(limite));
    return params;
}

export function rotuloIntervalo(pagina: number, limite: number, total: number): string {
    if (total <= 0) return "Mostrando 0 de 0";
    const inicio = (pagina - 1) * limite + 1;
    const fim = Math.min(pagina * limite, total);
    return `Mostrando ${inicio}-${fim} de ${total}`;
}
