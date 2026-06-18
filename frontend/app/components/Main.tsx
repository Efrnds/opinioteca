import MenuDireito from "./MenuDireito";
import MenuEsquerdo from "./MenuEsquerdo";

export default function Main({ children }: { children: React.ReactNode }) {
    return (
        <main className="flex h-[calc(100vh-96px)] overflow-hidden px-24">
            <aside className="flex w-1/5 shrink-0 flex-col overflow-hidden py-10">
                <MenuEsquerdo />
            </aside>

            <section className="min-h-0 flex-1 overflow-y-auto py-10 scrollbar-thin">
                <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">{children}</div>
            </section>

            <aside className="flex w-1/5 shrink-0 flex-col overflow-hidden py-10">
                <MenuDireito />
            </aside>
        </main>
    );
}
