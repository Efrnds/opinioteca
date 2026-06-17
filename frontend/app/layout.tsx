import { auth } from "@/auth";
import type { Metadata } from "next";
import Header from "./components/Header";
import Main from "./components/Main";
import Providers from "./providers";
import "./globals.css";

export const metadata: Metadata = {
    title: "Opinioteca",
    description: "A rede social para amantes de livros.",
    icons: {
        icon: "/assets/images/Vector.svg",
    },
};

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const session = await auth();
    const isLoggedIn = !!session;

    return (
        <html lang="pt-br">
            <body className={`antialiased ${isLoggedIn ? "h-screen w-screen" : ""}`}>
                <Providers>
                    {isLoggedIn ? (
                        <>
                            <Header />
                            <Main>{children}</Main>
                        </>
                    ) : (
                        children
                    )}
                </Providers>
            </body>
        </html>
    );
}
