import { headersLoginBackend } from "@/lib/login-client-ip";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    const formData = await req.formData();
    const nick = String(formData.get("nick") ?? "").trim();
    const senha = String(formData.get("senha") ?? "");
    const nome = String(formData.get("nome") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const imagem = formData.get("imagem");

    if (!nick || !senha || !(imagem instanceof Blob) || imagem.size === 0) {
        return NextResponse.json({ erro: "Dados incompletos para enviar a foto." }, { status: 400 });
    }

    const xff = req.headers.get("x-forwarded-for");
    const clientIp =
        xff?.split(",")[0]?.trim() ||
        req.headers.get("x-real-ip")?.trim() ||
        undefined;

    const loginRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/login`, {
        method: "POST",
        headers: headersLoginBackend(clientIp),
        body: JSON.stringify({ nick, senha }),
        cache: "no-store",
    });
    const loginData = (await loginRes.json().catch(() => ({}))) as {
        token?: string;
        usuario?: { nome?: string; email?: string; nick?: string };
        erro?: string;
    };
    if (!loginRes.ok || !loginData.token) {
        return NextResponse.json(
            { erro: typeof loginData.erro === "string" ? loginData.erro : "Não foi possível autenticar para enviar a foto." },
            { status: loginRes.status || 401 },
        );
    }

    const token = loginData.token;
    const uploadForm = new FormData();
    const nomeArquivo = imagem instanceof File && imagem.name
        ? imagem.name
        : "avatar.jpg";
    uploadForm.append("imagem", imagem, nomeArquivo);

    const uploadRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/upload/avatar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: uploadForm,
        cache: "no-store",
    });
    const uploadData = (await uploadRes.json().catch(() => ({}))) as {
        url?: string;
        erro?: string;
    };
    if (!uploadRes.ok || !uploadData.url) {
        return NextResponse.json(
            { erro: typeof uploadData.erro === "string" ? uploadData.erro : "Não foi possível enviar a foto." },
            { status: uploadRes.status || 500 },
        );
    }

    const imageUrl = uploadData.url;
    const putRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/usuarios/${encodeURIComponent(nick)}`,
        {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                nome: nome || loginData.usuario?.nome || nick,
                nick,
                email: email || loginData.usuario?.email || "",
                image: imageUrl,
            }),
            cache: "no-store",
        },
    );
    if (!putRes.ok) {
        const putData = (await putRes.json().catch(() => ({}))) as { erro?: string };
        return NextResponse.json(
            { erro: typeof putData.erro === "string" ? putData.erro : "Não foi possível salvar a foto no perfil." },
            { status: putRes.status || 500 },
        );
    }

    return NextResponse.json({ url: imageUrl });
}
