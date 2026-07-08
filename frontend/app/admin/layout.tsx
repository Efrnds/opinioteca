import { auth } from "@/auth";
import AdminShell from "@/app/components/admin/AdminShell";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const session = await auth();

    if (!session?.accessToken) {
        redirect("/?auth=login&callbackUrl=/admin");
    }

    if (!session.isAdmin) {
        redirect("/home");
    }

    return <AdminShell>{children}</AdminShell>;
}
