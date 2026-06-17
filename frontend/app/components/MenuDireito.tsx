import { Book } from "lucide-react";
import Link from "next/link";
import Box from "./Box";

export default function MenuDireito() {
    const sequencia = [
        {
            dia: "D",
            valor: false,
        },
        {
            dia: "S",
            valor: false,
        },
        {
            dia: "T",
            valor: false,
        },
        {
            dia: "Q",
            valor: true,
        },
        {
            dia: "Q",
            valor: true,
        },
        {
            dia: "S",
            valor: true,
        },
        {
            dia: "S",
            valor: false,
        },
    ];

    return (
        <section className=" h-full justify-between flex flex-col gap-11">
            <Box className="flex flex-col h-fit gap-2.5">
                <div className="flex justify-between gap-8">
                    <div className="flex flex-col">
                        <h2 className="font-gabarito-bold text-xl">Como está a semana?</h2>
                        <p className="font-gabarito-regular">Dias com o histórico de leitura</p>
                    </div>
                    <p className="font-gabarito-bold text-[#ed2d00] text-xl my-auto">
                        0 <span className="text-2xl">🔥</span>
                    </p>
                </div>
                <div className="flex justify-evenly gap-2.5">
                    {sequencia.map((item, index) => (
                        <div key={index} className="flex flex-col gap-1.5 rounded-full">
                            <div
                                className={`flex w-10 h-10 items-center justify-center ${item.valor == false ? "bg-azul-200" : "bg-azul-800"} rounded-full`}
                            >
                                <Book
                                    className={`h-5 w-5 ${item.valor == false ? "text-azul-400" : "text-azul-200"}`}
                                />
                            </div>
                            <p
                                className={`font-gabarito-bold text-center text-xl ${item.valor == false ? "text-azul-400" : "text-azul-800"}`}
                            >
                                {item.dia}
                            </p>
                        </div>
                    ))}
                </div>
            </Box>
            <Box className="flex flex-col h-fit gap-2.5">
                <div className="flex flex-col gap-8 flex-1">
                    <h1 className="font-gabarito-bold text-4xl">Ajuda</h1>
                    <div className="flex flex-col gap-2.5">
                        <Link href="/" className="flex  items-center gap-2">
                            <h2 className="font-gabarito-bold text-xl text-azul-700">Opção 1</h2>
                        </Link>
                        <Link href="/" className="flex  items-center gap-2">
                            <h2 className="font-gabarito-bold text-xl text-azul-700">Opção 2</h2>
                        </Link>
                        <Link href="/" className="flex  items-center gap-2">
                            <h2 className="font-gabarito-bold text-xl text-azul-700">Opção 3</h2>
                        </Link>
                    </div>
                </div>
            </Box>
        </section>
    );
}
