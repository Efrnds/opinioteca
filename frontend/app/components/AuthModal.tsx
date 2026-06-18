"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AnimatePresence, motion } from "framer-motion";
import { Pencil } from "lucide-react";
import { signIn } from "next-auth/react";
import Image from "next/image";
import { ChangeEvent, FormEvent, useId, useState } from "react";

type AuthMode = "login" | "cadastro";

type AuthModalProps = {
    open: boolean;
    mode: AuthMode;
    callbackUrl: string;
    onClose: () => void;
    onSwitchMode: (mode: AuthMode) => void;
};

const inputClassName =
    "w-full px-4 py-1 border-2 border-[#515151] rounded-full outline-none focus:border-azul-600 font-gabarito-regular bg-white";

export default function AuthModal({ open, mode, callbackUrl, onClose, onSwitchMode }: AuthModalProps) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [nome, setNome] = useState("");
    const [nick, setNick] = useState("");
    const [confirmarSenha, setConfirmarSenha] = useState("");
    const [imagem, setImagem] = useState<File | null>(null);
    const [previewImagem, setPreviewImagem] = useState<string | null>(null);
    const [erro, setErro] = useState("");
    const [carregando, setCarregando] = useState(false);
    const inputImagemId = useId();

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
        <Dialog
            open={open}
            onOpenChange={isOpen => {
                if (!isOpen) {
                    onClose();
                }
            }}
        >
            <DialogContent className="bg-background sm:max-w-md gap-4">
                <DialogHeader className="items-center text-center gap-4">
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.08, duration: 0.25 }}
                    >
                        <Image src="/assets/images/Vector.svg" width={80} height={65} alt="Logo da opinioteca" />
                    </motion.div>
                    <DialogTitle className="font-gabarito-bold text-3xl text-azul-900">
                        <AnimatePresence mode="wait">
                            <motion.span
                                key={mode}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                transition={{ duration: 0.2 }}
                            >
                                {mode === "login" ? "Entrar" : "Criar conta"}
                            </motion.span>
                        </AnimatePresence>
                    </DialogTitle>
                </DialogHeader>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={mode}
                        initial={{ opacity: 0, x: mode === "login" ? -12 : 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: mode === "login" ? 12 : -12 }}
                        transition={{ duration: 0.22, ease: "easeOut" }}
                    >
                        {mode === "login" ? (
                            <form onSubmit={handleLogin} className="flex flex-col gap-4">
                                <input
                                    type="email"
                                    placeholder="Email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    required
                                    className={inputClassName}
                                />
                                <input
                                    type="password"
                                    placeholder="Senha"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                    className={inputClassName}
                                />
                                {erro && <p className="text-red-600 text-sm text-center">{erro}</p>}
                                <Button
                                    type="submit"
                                    disabled={carregando}
                                    className="cursor-pointer h-auto rounded-full px-6 py-3 font-gabarito-bold text-xl bg-azul-600 hover:bg-azul-600/90 border-4 border-azul-600"
                                >
                                    {carregando ? "Entrando..." : "Entrar"}
                                </Button>
                                <p className="text-center text-sm">
                                    Não tem conta?{" "}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setErro("");
                                            onSwitchMode("cadastro");
                                        }}
                                        className="text-azul-600 font-bold underline cursor-pointer"
                                    >
                                        Criar conta
                                    </button>
                                </p>
                            </form>
                        ) : (
                            <form
                                onSubmit={handleCadastro}
                                className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto pr-1"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-sm font-bold text-azul-900 px-2">Foto de perfil (opcional)</p>
                                    <div className="flex items-center gap-4">
                                        <p className="min-w-0 truncate text-sm text-cinza-700">
                                            {imagem
                                                ? imagem.name.slice(0, 10) + "..."
                                                : "Clique no ícone para adicionar uma foto"}
                                        </p>
                                        <label
                                            htmlFor={inputImagemId}
                                            className="group relative h-14 w-14 shrink-0 cursor-pointer"
                                        >
                                            {previewImagem ? (
                                                <Image
                                                    src={previewImagem}
                                                    alt="Prévia da foto"
                                                    width={56}
                                                    height={56}
                                                    className="h-14 w-14 rounded-full object-cover"
                                                    unoptimized
                                                />
                                            ) : (
                                                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-200">
                                                    <Pencil className="h-5 w-5 text-azul-900" />
                                                </div>
                                            )}
                                            {previewImagem && (
                                                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                                                    <Pencil className="h-5 w-5 text-white" />
                                                </div>
                                            )}
                                            <input
                                                id={inputImagemId}
                                                type="file"
                                                accept="image/jpeg,image/png,image/webp,image/gif"
                                                onChange={handleSelecionarImagem}
                                                className="hidden"
                                            />
                                        </label>
                                    </div>
                                </div>
                                <input
                                    type="text"
                                    placeholder="Nome"
                                    value={nome}
                                    onChange={e => setNome(e.target.value)}
                                    required
                                    className={inputClassName}
                                />
                                <input
                                    type="text"
                                    placeholder="Nick"
                                    value={nick}
                                    onChange={e => setNick(e.target.value)}
                                    required
                                    className={inputClassName}
                                />
                                <input
                                    type="email"
                                    placeholder="Email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    required
                                    className={inputClassName}
                                />
                                <input
                                    type="password"
                                    placeholder="Senha"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                    className={inputClassName}
                                />
                                <input
                                    type="password"
                                    placeholder="Confirmar senha"
                                    value={confirmarSenha}
                                    onChange={e => setConfirmarSenha(e.target.value)}
                                    required
                                    className={inputClassName}
                                />
                                {erro && <p className="text-red-600 text-sm text-center">{erro}</p>}
                                <Button
                                    type="submit"
                                    disabled={carregando}
                                    className="h-auto rounded-full px-6 py-3 font-gabarito-bold text-xl bg-azul-600 hover:bg-azul-600/90 border-4 border-azul-600 cursor-pointer"
                                >
                                    {carregando ? "Criando..." : "Criar conta"}
                                </Button>
                                <p className="text-center text-sm">
                                    Já tem conta?{" "}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setErro("");
                                            onSwitchMode("login");
                                        }}
                                        className="text-azul-600 font-bold underline cursor-pointer"
                                    >
                                        Entrar
                                    </button>
                                </p>
                            </form>
                        )}
                    </motion.div>
                </AnimatePresence>
            </DialogContent>
        </Dialog>
    );
}
