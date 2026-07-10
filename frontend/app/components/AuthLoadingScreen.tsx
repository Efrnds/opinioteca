import Image from "next/image";

export default function AuthLoadingScreen() {
    return (
        <div className="flex h-screen w-screen items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-6">
                <Image
                    src="/assets/images/Vector.svg"
                    width={80}
                    height={65}
                    alt="Opinioteca"
                    className="logo-opinioteca animate-pulse"
                    priority
                />
                <p className="font-gabarito-bold text-lg text-azul-900">Carregando...</p>
            </div>
        </div>
    );
}
