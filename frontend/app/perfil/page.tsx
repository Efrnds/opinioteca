import { auth } from "@/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
    const session = await auth();

    if (!session?.user?.nick) {
        redirect("/");
    }

    redirect(`/perfil/${session.user.nick}`);
}
