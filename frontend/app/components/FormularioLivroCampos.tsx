"use client";

import type { CategoriaLivro, DadosLivroForm } from "@/lib/livro-cadastro";
import { mediaUrl } from "@/lib/media";
import Image from "next/image";

const inputRetangularClassName =
    "w-full px-4 py-2 border-2 border-[#515151] rounded-2xl outline-none focus:border-azul-600 font-gabarito-regular bg-white";

type FormularioLivroCamposProps = {
    dados: DadosLivroForm;
    modoManual: boolean;
    categorias: CategoriaLivro[];
    carregandoCategorias?: boolean;
    onChange: (campo: keyof DadosLivroForm, valor: string | number[]) => void;
    exibirCamposCompletos?: boolean;
};

export function SelecionarCategoriasLivro({
    categoriasIds,
    categorias,
    carregandoCategorias,
    onChange,
    obrigatorio,
}: {
    categoriasIds: number[];
    categorias: CategoriaLivro[];
    carregandoCategorias?: boolean;
    onChange: (valor: number[]) => void;
    obrigatorio?: boolean;
}) {
    function alternarCategoria(id: number) {
        const selecionadas = new Set(categoriasIds);
        if (selecionadas.has(id)) {
            selecionadas.delete(id);
        } else {
            selecionadas.add(id);
        }
        onChange(Array.from(selecionadas).sort((a, b) => a - b));
    }

    return (
        <div className="flex flex-col gap-2">
            <label className="font-gabarito-bold text-sm text-azul-900">
                Categorias{obrigatorio ? " *" : ""}
            </label>
            {carregandoCategorias ? (
                <p className="font-gabarito-regular text-sm text-cinza-700">Carregando categorias...</p>
            ) : (
                <div className="flex flex-wrap gap-2">
                    {categorias.map((cat) => {
                        const selecionada = categoriasIds.includes(cat.id);
                        return (
                            <button
                                key={cat.id}
                                type="button"
                                onClick={() => alternarCategoria(cat.id)}
                                className={`rounded-full border-2 px-3 py-1.5 font-gabarito-medium text-sm transition-colors ${
                                    selecionada
                                        ? "border-azul-600 bg-azul-600 text-white"
                                        : "border-[#515151] bg-white text-azul-900 hover:border-azul-600"
                                }`}
                            >
                                {cat.nome_categoria}
                            </button>
                        );
                    })}
                </div>
            )}
            {obrigatorio && categoriasIds.length === 0 && !carregandoCategorias && (
                <p className="font-gabarito-regular text-xs text-cinza-700">
                    Selecione ao menos uma categoria.
                </p>
            )}
        </div>
    );
}

export default function FormularioLivroCampos({
    dados,
    modoManual,
    categorias,
    carregandoCategorias,
    onChange,
    exibirCamposCompletos = true,
}: FormularioLivroCamposProps) {
    const precisaCategoria = !dados.livro_id;

    return (
        <div className="flex flex-col gap-4">
            {modoManual && (
                <>
                    <input
                        type="text"
                        value={dados.titulo}
                        onChange={(e) => onChange("titulo", e.target.value)}
                        placeholder="Título *"
                        className={inputRetangularClassName}
                        required
                    />
                    <input
                        type="text"
                        value={dados.autor}
                        onChange={(e) => onChange("autor", e.target.value)}
                        placeholder="Autor *"
                        className={inputRetangularClassName}
                        required
                    />
                </>
            )}

            {exibirCamposCompletos && (
                <div className="flex gap-3">
                    {mediaUrl(dados.capa_url) ? (
                        <Image
                            src={mediaUrl(dados.capa_url)!}
                            alt={dados.titulo || "Capa"}
                            width={56}
                            height={84}
                            className="h-[84px] w-14 shrink-0 rounded-lg object-cover"
                            unoptimized
                        />
                    ) : (
                        <div className="flex h-[84px] w-14 shrink-0 items-center justify-center rounded-lg bg-azul-200 text-xl">
                            📖
                        </div>
                    )}
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                        {!modoManual && (
                            <>
                                <input
                                    type="text"
                                    value={dados.titulo}
                                    onChange={(e) => onChange("titulo", e.target.value)}
                                    placeholder="Título *"
                                    className={inputRetangularClassName}
                                    required
                                />
                                <input
                                    type="text"
                                    value={dados.autor}
                                    onChange={(e) => onChange("autor", e.target.value)}
                                    placeholder="Autor *"
                                    className={inputRetangularClassName}
                                    required
                                />
                            </>
                        )}
                    </div>
                </div>
            )}

            {!modoManual && !exibirCamposCompletos && (
                <p className="font-gabarito-regular text-sm text-cinza-700">{dados.autor}</p>
            )}

            {exibirCamposCompletos && (
                <div className="grid grid-cols-2 gap-3">
                    <input
                        type="number"
                        min={1}
                        value={dados.paginas}
                        onChange={(e) => onChange("paginas", e.target.value)}
                        placeholder="Páginas"
                        className={inputRetangularClassName}
                    />
                    <input
                        type="url"
                        value={dados.capa_url}
                        onChange={(e) => onChange("capa_url", e.target.value)}
                        placeholder="URL da capa"
                        className={inputRetangularClassName}
                    />
                </div>
            )}

            {precisaCategoria && (
                <SelecionarCategoriasLivro
                    categoriasIds={dados.categorias_ids}
                    categorias={categorias}
                    carregandoCategorias={carregandoCategorias}
                    onChange={(valor) => onChange("categorias_ids", valor)}
                    obrigatorio
                />
            )}
        </div>
    );
}
