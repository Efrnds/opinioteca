import type { ReactNode } from "react";

export type AdminTableColumn<T> = {
    key: string;
    header: string;
    render: (item: T) => ReactNode;
    className?: string;
};

type AdminTableProps<T> = {
    columns: AdminTableColumn<T>[];
    data: T[] | null | undefined;
    keyExtractor: (item: T) => string | number;
    emptyMessage?: string;
};

export default function AdminTable<T>({
    columns,
    data,
    keyExtractor,
    emptyMessage = "Nenhum registro encontrado.",
}: AdminTableProps<T>) {
    const itens = data ?? [];

    if (itens.length === 0) {
        return (
            <p className="py-12 text-center font-gabarito-regular text-sm text-cinza-700">{emptyMessage}</p>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left">
                <thead>
                    <tr className="border-b border-cinza-200">
                        {columns.map((col) => (
                            <th
                                key={col.key}
                                className={`px-4 py-3 font-gabarito-bold text-sm text-azul-900 ${col.className ?? ""}`}
                            >
                                {col.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {itens.map((item, index) => (
                        <tr
                            key={keyExtractor(item)}
                            className={index % 2 === 0 ? "bg-white" : "bg-background"}
                        >
                            {columns.map((col) => (
                                <td
                                    key={col.key}
                                    className={`px-4 py-3 font-gabarito-regular text-sm text-azul-900 ${col.className ?? ""}`}
                                >
                                    {col.render(item)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
