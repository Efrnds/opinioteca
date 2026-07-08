import type { Metadata } from "next";
import Providers from "./providers";
import "./globals.css";
import { Figtree } from "next/font/google";
import { cn } from "@/lib/utils";

const figtree = Figtree({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
    title: "Opinioteca",
    description: "A rede social para amantes de livros.",
    icons: {
        icon: [{ url: "/assets/images/Vector.svg", type: "image/svg+xml" }],
        shortcut: "/assets/images/Vector.svg",
        apple: "/assets/images/Vector.svg",
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="pt-br" className={cn("font-sans", figtree.variable)}>
            <body className="antialiased">
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
