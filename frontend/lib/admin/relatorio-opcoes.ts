import { parseListaPaginada } from "@/lib/admin/paginacao";
import type { RelatorioFonte, RelatorioOpcao } from "@/lib/admin/relatorios";
import type { CategoriaAdmin, LivroAdmin, UsuarioAdmin } from "@/types/admin";

const LIMITE = 100;

async function carregarTodasPaginas<T>(urlBase: string): Promise<T[]> {
    const itens: T[] = [];
    let pagina = 1;
    let total = Infinity;
    while (itens.length < total) {
        const params = new URLSearchParams({
            pagina: String(pagina),
            limite: String(LIMITE),
        });
        const res = await fetch(`${urlBase}?${params}`);
        if (!res.ok) break;
        const data = parseListaPaginada<T>(await res.json());
        itens.push(...data.itens);
        total = data.total;
        if (data.itens.length === 0) break;
        pagina += 1;
        if (pagina > 50) break;
    }
    return itens;
}

function unicosOrdenados(valores: string[]): RelatorioOpcao[] {
    const set = new Set<string>();
    for (const v of valores) {
        const t = v.trim();
        if (t) set.add(t);
    }
    return [...set]
        .sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }))
        .map((v) => ({ value: v, label: v }));
}

export async function carregarOpcoesRelatorio(fonte: RelatorioFonte): Promise<RelatorioOpcao[]> {
    switch (fonte) {
        case "usuarios": {
            const usuarios = await carregarTodasPaginas<UsuarioAdmin>("/api/admin/usuarios");
            return usuarios
                .slice()
                .sort((a, b) => a.nick.localeCompare(b.nick, "pt-BR", { sensitivity: "base" }))
                .map((u) => ({
                    value: String(u.id),
                    label: `@${u.nick} - ${u.nome} (${u.email})`,
                }));
        }
        case "livros": {
            const livros = await carregarTodasPaginas<LivroAdmin>("/api/admin/livros");
            return livros
                .slice()
                .sort((a, b) => a.titulo.localeCompare(b.titulo, "pt-BR", { sensitivity: "base" }))
                .map((l) => ({
                    value: String(l.id),
                    label: `${l.titulo}${l.autor ? ` - ${l.autor}` : ""}`,
                }));
        }
        case "categorias": {
            const categorias = await carregarTodasPaginas<CategoriaAdmin>("/api/admin/categorias");
            return categorias
                .slice()
                .sort((a, b) =>
                    a.nome_categoria.localeCompare(b.nome_categoria, "pt-BR", { sensitivity: "base" }),
                )
                .map((c) => ({
                    value: String(c.id),
                    label: c.nome_categoria,
                }));
        }
        case "autores": {
            const livros = await carregarTodasPaginas<LivroAdmin>("/api/admin/livros");
            return unicosOrdenados(livros.map((l) => l.autor ?? ""));
        }
        case "editoras": {
            const livros = await carregarTodasPaginas<LivroAdmin>("/api/admin/livros");
            return unicosOrdenados(livros.map((l) => l.editora ?? ""));
        }
        default:
            return [];
    }
}
