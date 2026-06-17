import MenuEsquerdo from "./MenuEsquerdo";
import MenuDireito from "./MenuDireito";

export default function Main({ children }: { children: React.ReactNode }) {
    return (
        <main className="flex gap-20 px-24 py-10 h-[calc(100vh-96px)]">
            <MenuEsquerdo />
            <div className="flex-1">{children}</div>
            <MenuDireito />
        </main>
    );
}
