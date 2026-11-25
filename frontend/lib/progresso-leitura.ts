export type TipoProgressoLeitura = "porcentagem" | "paginas";
export function paginasPorPorcentagem(porcentagem: number, totalPaginas: number) {
    return porcentagem >= 100
        ? totalPaginas
        : Math.min(totalPaginas - 1, Math.round(totalPaginas * porcentagem / 100));
}
export function calcularProgressoLeitura(tipo: TipoProgressoLeitura, valor: number, porcentagemAtual: number, totalPaginas: number) {
    if (!Number.isFinite(valor) || !Number.isFinite(porcentagemAtual) ||
        !Number.isInteger(totalPaginas) || totalPaginas <= 0 ||
        porcentagemAtual < 0 || porcentagemAtual >= 100)
        return null;
    const paginaAnterior = paginasPorPorcentagem(porcentagemAtual, totalPaginas);
    if (tipo === "paginas") {
        if (!Number.isInteger(valor) || valor <= 0 || valor > totalPaginas - paginaAnterior)
            return null;
        const paginaAtual = paginaAnterior + valor;
        return { paginasLidas: valor, paginaAtual, porcentagem: paginaAtual / totalPaginas * 100 };
    }
    if (valor <= porcentagemAtual || valor > 100)
        return null;
    const paginaAtual = paginasPorPorcentagem(valor, totalPaginas);
    const paginasLidas = paginaAtual - paginaAnterior;
    if (paginasLidas <= 0)
        return null;
    return { paginasLidas, paginaAtual, porcentagem: valor };
}
export function formatarPorcentagemLeitura(valor: number) {
    return valor.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}
