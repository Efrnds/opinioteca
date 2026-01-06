import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Opinioteca",
  description: "Rede social voltada para leitores.",
  icons: {
    icon: "/assets/images/Vector.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-br">
      <body className={`antialiased`}>{children}</body>
    </html>
  );
}
