import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
    interface Session {
        accessToken?: string;
        isAdmin?: boolean;
        user: {
            id?: string;
            name?: string | null;
            email?: string | null;
            image?: string | null;
            nick?: string;
        };
    }

    interface User {
        id?: string;
        accessToken?: string;
        isAdmin?: boolean;
        nick?: string;
        image?: string;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        accessToken?: string;
        isAdmin?: boolean;
        id?: string;
        email?: string;
        name?: string;
        nick?: string;
        image?: string;
    }
}
