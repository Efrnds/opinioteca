import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { mediaUrl } from "@/lib/media";

export const { handlers, auth, signIn, signOut } = NextAuth({
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/login`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: credentials?.email,
                        senha: credentials?.password,
                    }),
                });

                const data = await res.json();

                if (res.ok && data.token) {
                    const usuario = data.usuario;
                    return {
                        id: String(usuario?.id ?? ""),
                        email: usuario?.email,
                        name: usuario?.nome,
                        nick: usuario?.nick,
                        image: mediaUrl(usuario?.image),
                        accessToken: data.token,
                        isAdmin: data.isAdmin,
                    };
                }

                return null;
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user, trigger, session }) {
            if (user) {
                token.id = user.id;
                token.accessToken = user.accessToken;
                token.isAdmin = user.isAdmin;
                if (user.email) token.email = user.email;
                if (user.name) token.name = user.name;
                if (user.nick) token.nick = user.nick;
                if (user.image) token.image = mediaUrl(user.image);
            }
            if (trigger === "update" && session) {
                if (session.name) token.name = session.name as string;
                if (session.image) token.image = mediaUrl(session.image as string);
                if (session.nick) token.nick = session.nick as string;
            }
            return token;
        },
        async session({ session, token }) {
            session.accessToken = token.accessToken as string;
            session.isAdmin = token.isAdmin as boolean;
            if (token.id) session.user.id = token.id;
            if (token.email) session.user.email = token.email;
            if (token.name) session.user.name = token.name;
            if (token.nick) session.user.nick = token.nick;
            if (token.image) session.user.image = mediaUrl(token.image as string);
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
