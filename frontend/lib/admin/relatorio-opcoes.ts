import { parseListaPaginada } from "@/lib/admin/paginacao";
import type { RelatorioFonte, RelatorioOpcao } from "@/lib/admin/relatorios";
import type { CategoriaAdmin, LivroAdmin, UsuarioAdmin } from "@/types/admin";

const LIMITE = 100;

function normalizarChave(s: string): string {
    return s.trim().toLowerCase().replace(/\s+/g, " ");
}

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

function unicosPorLabel(opcoes: RelatorioOpcao[]): RelatorioOpcao[] {
    const vistos = new Map<string, RelatorioOpcao>();
    for (const o of opcoes) {
        const chave = normalizarChave(o.label);
        if (!chave || vistos.has(chave)) continue;
        vistos.set(chave, o);
    }
    return [...vistos.values()].sort((a, b) =>
        a.label.localeCompare(b.label, "pt-BR", { sensitivity: "base" }),
    );
}

function unicosOrdenados(valores: string[]): RelatorioOpcao[] {
    const vistos = new Map<string, string>();
    for (const v of valores) {
        const t = v.trim().replace(/\s+/g, " ");
        if (!t) continue;
        const chave = normalizarChave(t);
        if (!vistos.has(chave)) vistos.set(chave, t);
    }
    return [...vistos.values()]
        .sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }))
        .map((v) => ({ value: v, label: v }));
}

export async function carregarOpcoesRelatorio(fonte: RelatorioFonte): Promise<RelatorioOpcao[]> {
    switch (fonte) {
        case "usuarios": {
            const usuarios = await carregarTodasPaginas<UsuarioAdmin>("/api/admin/usuarios");
            const porId = new Map<number, RelatorioOpcao>();
            for (const u of usuarios) {
                if (!u?.id || porId.has(u.id)) continue;
                porId.set(u.id, {
                    value: String(u.id),
                    label: `@${u.nick} - ${u.nome} (${u.email})`,
                });
            }
            return [...porId.values()].sort((a, b) =>
                a.label.localeCompare(b.label, "pt-BR", { sensitivity: "base" }),
            );
        }
        case "livros": {
            const livros = await carregarTodasPaginas<LivroAdmin>("/api/admin/livros");
            const opcoes = livros
                .filter((l) => l?.id && l.titulo?.trim())
                .map((l) => ({
                    value: String(l.id),
                    label: `${l.titulo.trim()}${l.autor?.trim() ? ` - ${l.autor.trim()}` : ""}`,
                }));
            return unicosPorLabel(opcoes);
        }
        case "categorias": {
            const categorias = await carregarTodasPaginas<CategoriaAdmin>("/api/admin/categorias");
            const porId = new Map<number, RelatorioOpcao>();
            for (const c of categorias) {
                if (!c?.id || porId.has(c.id)) continue;
                porId.set(c.id, {
                    value: String(c.id),
                    label: c.nome_categoria,
                });
            }
            return [...porId.values()].sort((a, b) =>
                a.label.localeCompare(b.label, "pt-BR", { sensitivity: "base" }),
            );
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
