import type { Metadata, Viewport } from "next";
import Providers from "./providers";
import "./globals.css";
import { Figtree } from "next/font/google";
import { cn } from "@/lib/utils";
import { SCRIPT_TEMA_ANTES_PAINT } from "@/lib/tema";

const figtree = Figtree({subsets:['latin'],variable:'--font-sans'});

/** Evita cache de HTML/RSC com sessão embutida (session bleed via proxy/CDN). */
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export const metadata: Metadata = {
    title: "Opinioteca",
    description: "A rede social para amantes de livros.",
    verification: {
        google: "5JoCIfP0PZoi4sEKtDzMVAXChr8Dv4qXaTNdbSneLeE",
    },
    icons: {
        icon: [{ url: "/assets/images/Vector.svg", type: "image/svg+xml" }],
        shortcut: "/assets/images/Vector.svg",
        apple: "/assets/images/Vector.svg",
    },
};

/** Blocks iOS Safari auto-zoom on focus / pinch; viewport-fit for notches. */
export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="pt-br" className={cn("font-sans", figtree.variable)} data-tema="claro" suppressHydrationWarning>
            <head>
                <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA_ANTES_PAINT }} />
            </head>
            <body className="antialiased">
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
