import { Search } from "lucide-react";
import Image from "next/image";

export default function Header() {
    return (
        <header className="flex justify-between items-center p-4 border-b-2 border-azul-900">
            <div className="flex items-left min-w-72 gap-4">
                <Image
                    src={"/assets/images/Vector.svg"}
                    width={200}
                    height={163}
                    alt="Logo da opinioteca"
                    className="h-9 w-fit "
                ></Image>
            </div>
            <h1 className="font-gabarito-bold text-4xl flex-1 text-center">opinioteca</h1>
            <div className="flex justify-between gap-4 bg-white rounded-full p-2 min-w-72 border-4 border-transparent transition-all duration-300 [&:hover:not(:focus-within)]:border-cinza-700 focus-within:border-azul-600">
                <input type="text" placeholder="" className="outline-none bg-transparent text-black" />
                <Search className="h-6 w-6 text-black" />
            </div>
        </header>
    );
}
