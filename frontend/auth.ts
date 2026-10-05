import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import {
    opiniotecaCookieNames,
    opiniotecaCookieOptions,
    useSecureAuthCookies,
} from "@/lib/auth-cookies";
import { headersLoginBackend, ipClienteDosHeaders } from "@/lib/login-client-ip";
import { mediaUrl } from "@/lib/media";

/** Alinhado ao JWT do backend (6h). Sessões longas deixavam identidade “fantasma” em browsers compartilhados. */
const SESSION_MAX_AGE_SEC = 60 * 60 * 6;

const secureCookies = useSecureAuthCookies();
const cookieNames = opiniotecaCookieNames(secureCookies);
const cookieOpts = opiniotecaCookieOptions(secureCookies);

type BackendLogin = {
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
};

function sessaoDoBackend(data: BackendLogin) {
    const usuario = data.usuario;
    const id = usuario?.id != null && String(usuario.id) !== "" ? String(usuario.id) : null;
    if (!data.token || !id || !usuario?.nick) {
        return null;
    }
    return {
        sub: id,
        id,
        accessToken: data.token,
        isAdmin: Boolean(data.isAdmin),
        email: usuario.email ?? undefined,
        name: usuario.nome ?? undefined,
        nick: usuario.nick,
        image: usuario.image ? mediaUrl(usuario.image) : undefined,
        assinaturaId: usuario.assinaturaId ?? undefined,
    };
}

async function loginGoogleNoBackend(idToken: string) {
    const clientIp = await ipClienteDosHeaders();
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/login/google`, {
        method: "POST",
        headers: headersLoginBackend(clientIp),
        body: JSON.stringify({ idToken }),
    });

    let data: BackendLogin & { erro?: string } = {};
    try {
        data = await res.json();
    } catch {
        throw new Error("Resposta inválida do servidor ao entrar com Google.");
    }

    if (!res.ok) {
        throw new Error(
            typeof data.erro === "string" ? data.erro : "Não foi possível entrar com Google.",
        );
    }

    const sessao = sessaoDoBackend(data);
    if (!sessao) {
        throw new Error("Login Google incompleto.");
    }
    return sessao;
}

const googleId = process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID;
const googleSecret = process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET;

export const { handlers, auth, signIn, signOut } = NextAuth({
    /**
     * Cookies host-only (sem `domain`) + nomes únicos da Opinioteca.
     * Em produção: prefixo `__Host-` (Secure + Path=/ + sem Domain).
     * Nunca reutilize AUTH_SECRET com calmera-os / outros apps em prismapp.
     */
    cookies: {
        sessionToken: {
            name: cookieNames.sessionToken,
            options: cookieOpts,
        },
        callbackUrl: {
            name: cookieNames.callbackUrl,
            options: cookieOpts,
        },
        csrfToken: {
            name: cookieNames.csrfToken,
            options: cookieOpts,
        },
    },
    useSecureCookies: secureCookies,
    providers: [
        ...(googleId && googleSecret
            ? [
                  Google({
                      clientId: googleId,
                      clientSecret: googleSecret,
                  }),
              ]
            : []),
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                nick: { label: "Nome de usuário", type: "text" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                const clientIp = await ipClienteDosHeaders();
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/login`, {
                    method: "POST",
                    headers: headersLoginBackend(clientIp),
                    body: JSON.stringify({
                        nick: credentials?.nick,
                        senha: credentials?.password,
                    }),
                });

                // Não use res.json() sem try: backend 500 / HTML quebra o authorize → 500 no Auth.js
                // e o AuthModal chama /api/login de novo (aparece 500 depois CredentialsSignin/401).
                let data: BackendLogin | null = null;
                try {
                    data = await res.json();
                } catch {
                    return null;
                }

                if (res.ok && data?.token) {
                    const usuario = data.usuario;
                    const id =
                        usuario?.id != null && String(usuario.id) !== "" ? String(usuario.id) : null;
                    if (!id || !usuario?.nick) {
                        return null;
                    }
                    if (process.env.NODE_ENV === "development") {
                        console.info("[auth] authorize ok", { id, nick: usuario.nick });
                    }
                    return {
                        id,
                        email: usuario.email,
                        name: usuario.nome,
                        nick: usuario.nick,
                        image: mediaUrl(usuario.image),
                        assinaturaId: usuario.assinaturaId,
                        accessToken: data.token,
                        isAdmin: Boolean(data.isAdmin),
                    };
                }

                return null;
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user, account, trigger, session }) {
            if (account?.provider === "google") {
                if (!account.id_token) {
                    throw new Error("Google não retornou id_token.");
                }
                const sessao = await loginGoogleNoBackend(account.id_token);
                if (process.env.NODE_ENV === "development") {
                    console.info("[auth] google ok", { id: sessao.id, nick: sessao.nick });
                }
                return sessao;
            }

            // Login: objeto NOVO — nunca espalhar/mesclar o token anterior (campos órfãos vazavam identidade).
            if (user) {
                return {
                    sub: user.id,
                    id: user.id,
                    accessToken: user.accessToken,
                    isAdmin: Boolean(user.isAdmin),
                    email: user.email ?? undefined,
                    name: user.name ?? undefined,
                    nick: user.nick ?? undefined,
                    image: user.image ? mediaUrl(user.image) : undefined,
                    assinaturaId: user.assinaturaId ?? undefined,
                };
            }
            if (trigger === "update" && session) {
                // update() só pode alterar perfil; id/sub/accessToken vêm só do token atual.
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
            // Identidade só do token — nunca preservar leftovers de session.user.
            user.id = (token.id as string) ?? (token.sub as string);
            user.email = (token.email as string | null | undefined) ?? null;
            user.name = (token.name as string | null | undefined) ?? null;
            user.nick = (token.nick as string | undefined) ?? undefined;
            user.image = token.image ? mediaUrl(token.image as string) : null;
            user.assinaturaId = token.assinaturaId != null ? (token.assinaturaId as number) : undefined;
            return session;
        },
    },
    events: {
        async signIn({ user }) {
            if (process.env.NODE_ENV === "development") {
                console.info("[auth] signIn", { id: user.id, nick: user.nick });
            }
        },
        async signOut() {
            if (process.env.NODE_ENV === "development") {
                console.info("[auth] signOut");
            }
        },
    },
    pages: {
        signIn: "/",
        error: "/",
    },
    session: {
        strategy: "jwt",
        maxAge: SESSION_MAX_AGE_SEC,
    },
    jwt: {
        maxAge: SESSION_MAX_AGE_SEC,
    },
    secret: process.env.AUTH_SECRET,
    trustHost: true,
});
