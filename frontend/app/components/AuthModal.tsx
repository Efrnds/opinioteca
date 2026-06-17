"use client";

import { signIn } from "next-auth/react";
import { X } from "lucide-react";
import Image from "next/image";
import { ChangeEvent, FormEvent, useState } from "react";

type AuthMode = "login" | "cadastro";

type AuthModalProps = {
    mode: AuthMode;
    callbackUrl: string;
    onClose: () => void;
    onSwitchMode: (mode: AuthMode) => void;
};

export default function AuthModal({ mode, callbackUrl, onClose, onSwitchMode }: AuthModalProps) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [nome, setNome] = useState("");
    const [nick, setNick] = useState("");
    const [confirmarSenha, setConfirmarSenha] = useState("");
    const [imagem, setImagem] = useState<File | null>(null);
    const [previewImagem, setPreviewImagem] = useState<string | null>(null);
    const [erro, setErro] = useState("");
    const [carregando, setCarregando] = useState(false);

    function handleSelecionarImagem(e: ChangeEvent<HTMLInputElement>) {
        const arquivo = e.target.files?.[0];
        if (!arquivo) {
            return;
        }

        if (!arquivo.type.startsWith("image/")) {
            setErro("Selecione um arquivo de imagem válido.");
            return;
        }

        if (arquivo.size > 5 * 1024 * 1024) {
            setErro("A imagem deve ter no máximo 5MB.");
            return;
        }

        setErro("");
        setImagem(arquivo);
        setPreviewImagem(URL.createObjectURL(arquivo));
    }

    async function enviarImagem(): Promise<string | undefined> {
        if (!imagem) {
            return undefined;
        }

        const formData = new FormData();
        formData.append("imagem", imagem);

        const res = await fetch("/api/upload", {
            method: "POST",
            body: formData,
        });

        const data = await res.json();

        if (!res.ok || !data.url) {
            throw new Error(data.erro || "Não foi possível enviar a imagem.");
        }

        return data.url as string;
    }

    async function handleLogin(e: FormEvent) {
        e.preventDefault();
        setErro("");
        setCarregando(true);

        const result = await signIn("credentials", {
            email,
            password,
            redirect: false,
        });

        setCarregando(false);

        if (result?.error) {
            setErro("Email ou senha inválidos.");
            return;
        }

        window.location.href = callbackUrl;
    }

    async function handleCadastro(e: FormEvent) {
        e.preventDefault();
        setErro("");

        if (password !== confirmarSenha) {
            setErro("As senhas não coincidem.");
            return;
        }

        setCarregando(true);

        try {
            const imageUrl = await enviarImagem();

            const res = await fetch("/api/cadastro", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    nome,
                    nick,
                    email,
                    senha: password,
                    ...(imageUrl ? { image: imageUrl } : {}),
                }),
            });

            if (!res.ok) {
                setErro("Não foi possível criar a conta. Verifique os dados.");
                return;
            }

            const result = await signIn("credentials", {
                email,
                password,
                redirect: false,
            });

            if (result?.error) {
                setErro("Conta criada, mas o login falhou. Tente entrar manualmente.");
                onSwitchMode("login");
                return;
            }

            window.location.href = callbackUrl;
        } catch (uploadErro) {
            setErro(uploadErro instanceof Error ? uploadErro.message : "Erro ao enviar imagem.");
        } finally {
            setCarregando(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button
                type="button"
                aria-label="Fechar"
                className="absolute inset-0 bg-black/50"
                onClick={onClose}
            />
            <div className="relative z-10 w-full max-w-md rounded-3xl bg-background p-8 shadow-xl border-4 border-azul-600">
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute top-4 right-4 text-azul-900 hover:opacity-70"
                >
                    <X className="h-6 w-6" />
                </button>

                <div className="flex flex-col items-center gap-4 mb-6">
                    <Image src="/assets/images/Vector.svg" width={80} height={65} alt="Logo da opinioteca" />
                    <h2 className="font-gabarito-bold text-3xl text-azul-900">
                        {mode === "login" ? "Entrar" : "Criar conta"}
                    </h2>
                </div>

                {mode === "login" ? (
                    <form onSubmit={handleLogin} className="flex flex-col gap-4">
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="px-4 py-3 border-2 border-azul-900 rounded-full outline-none focus:border-azul-600"
                        />
                        <input
                            type="password"
                            placeholder="Senha"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="px-4 py-3 border-2 border-azul-900 rounded-full outline-none focus:border-azul-600"
                        />
                        {erro && <p className="text-red-600 text-sm text-center">{erro}</p>}
                        <button
                            type="submit"
                            disabled={carregando}
                            className="px-6 py-3 rounded-full text-white font-gabarito-bold text-xl bg-azul-600 border-4 border-azul-600 disabled:opacity-50"
                        >
                            {carregando ? "Entrando..." : "Entrar"}
                        </button>
                        <p className="text-center text-sm">
                            Não tem conta?{" "}
                            <button
                                type="button"
                                onClick={() => {
                                    setErro("");
                                    onSwitchMode("cadastro");
                                }}
                                className="text-azul-600 font-bold underline"
                            >
                                Criar conta
                            </button>
                        </p>
                    </form>
                ) : (
                    <form onSubmit={handleCadastro} className="flex flex-col gap-4">
                        <input
                            type="text"
                            placeholder="Nome"
                            value={nome}
                            onChange={(e) => setNome(e.target.value)}
                            required
                            className="px-4 py-3 border-2 border-azul-900 rounded-full outline-none focus:border-azul-600"
                        />
                        <input
                            type="text"
                            placeholder="Nick"
                            value={nick}
                            onChange={(e) => setNick(e.target.value)}
                            required
                            className="px-4 py-3 border-2 border-azul-900 rounded-full outline-none focus:border-azul-600"
                        />
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-bold text-azul-900 px-2">Foto de perfil (opcional)</label>
                            <div className="flex items-center gap-4">
                                {previewImagem ? (
                                    <Image
                                        src={previewImagem}
                                        alt="Prévia da foto"
                                        width={56}
                                        height={56}
                                        className="w-14 h-14 rounded-full object-cover"
                                        unoptimized
                                    />
                                ) : (
                                    <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center font-gabarito-bold text-xl">
                                        {nome.charAt(0).toUpperCase() || "?"}
                                    </div>
                                )}
                                <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp,image/gif"
                                    onChange={handleSelecionarImagem}
                                    className="text-sm"
                                />
                            </div>
                        </div>
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="px-4 py-3 border-2 border-azul-900 rounded-full outline-none focus:border-azul-600"
                        />
                        <input
                            type="password"
                            placeholder="Senha"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="px-4 py-3 border-2 border-azul-900 rounded-full outline-none focus:border-azul-600"
                        />
                        <input
                            type="password"
                            placeholder="Confirmar senha"
                            value={confirmarSenha}
                            onChange={(e) => setConfirmarSenha(e.target.value)}
                            required
                            className="px-4 py-3 border-2 border-azul-900 rounded-full outline-none focus:border-azul-600"
                        />
                        {erro && <p className="text-red-600 text-sm text-center">{erro}</p>}
                        <button
                            type="submit"
                            disabled={carregando}
                            className="px-6 py-3 rounded-full text-white font-gabarito-bold text-xl bg-azul-600 border-4 border-azul-600 disabled:opacity-50"
                        >
                            {carregando ? "Criando..." : "Criar conta"}
                        </button>
                        <p className="text-center text-sm">
                            Já tem conta?{" "}
                            <button
                                type="button"
                                onClick={() => {
                                    setErro("");
                                    onSwitchMode("login");
                                }}
                                className="text-azul-600 font-bold underline"
                            >
                                Entrar
                            </button>
                        </p>
                    </form>
                )}
            </div>
        </div>
    );
}
