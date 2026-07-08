import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { mediaUrl } from "@/lib/media";

export const { handlers, auth, signIn, signOut } = NextAuth({
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                nick: { label: "Nome de usuário", type: "text" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/login`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        nick: credentials?.nick,
                        senha: credentials?.password,
                    }),
                });

                // Não use res.json() sem try: backend 500 / HTML quebra o authorize → 500 no Auth.js
                // e o AuthModal chama /api/login de novo (aparece 500 depois CredentialsSignin/401).
                let data: {
                    token?: string;
                    isAdmin?: boolean;
                    usuario?: {
                        id?: number | string;
                        email?: string;
                        nome?: string;
                        nick?: string;
                        image?: string;
                        assinaturaId?: number;
                    };
                } | null = null;
                try {
                    data = await res.json();
                } catch {
                    return null;
                }

                if (res.ok && data?.token) {
                    const usuario = data.usuario;
                    return {
                        id: String(usuario?.id ?? ""),
                        email: usuario?.email,
                        name: usuario?.nome,
                        nick: usuario?.nick,
                        image: mediaUrl(usuario?.image),
                        assinaturaId: usuario?.assinaturaId,
                        accessToken: data.token,
                        isAdmin: Boolean(data.isAdmin),
                    };
                }

                return null;
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user, trigger, session }) {
            // Login: substitui identidade inteira — merge condicional deixava nick/imagem do usuário anterior.
            if (user) {
                token.sub = user.id;
                token.id = user.id;
                token.accessToken = user.accessToken;
                token.isAdmin = Boolean(user.isAdmin);
                token.email = user.email ?? undefined;
                token.name = user.name ?? undefined;
                token.nick = user.nick ?? undefined;
                token.image = user.image ? mediaUrl(user.image) : undefined;
                token.assinaturaId = user.assinaturaId ?? undefined;
                return token;
            }
            if (trigger === "update" && session) {
                if (session.name !== undefined) token.name = session.name as string;
                if (session.image !== undefined) {
                    token.image = session.image ? mediaUrl(session.image as string) : undefined;
                }
                if (session.nick !== undefined) token.nick = session.nick as string;
                if (session.assinaturaId !== undefined) {
                    token.assinaturaId = session.assinaturaId as number | undefined;
                }
            }
            return token;
        },
        async session({ session, token }) {
            session.accessToken = token.accessToken as string;
            session.isAdmin = Boolean(token.isAdmin);
            const user = session.user as {
                id?: string;
                name?: string | null;
                email?: string | null;
                image?: string | null;
                nick?: string;
                assinaturaId?: number;
            };
            user.id = token.id as string;
            user.email = (token.email as string | null | undefined) ?? null;
            user.name = (token.name as string | null | undefined) ?? null;
            user.nick = token.nick ?? undefined;
            user.image = token.image ? mediaUrl(token.image as string) : null;
            user.assinaturaId = token.assinaturaId != null ? (token.assinaturaId as number) : undefined;
            return session;
        },
    },
    pages: {
        signIn: "/",
    },
    session: {
        strategy: "jwt",
    },
    secret: process.env.AUTH_SECRET,
});
