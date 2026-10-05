"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
    destinoPosLogin,
    limparStorageCliente,
    purgeCookiesAuth,
    sinalizarTrocaAuth,
} from "@/lib/session-cleanup";
import { AnimatePresence, motion } from "framer-motion";
import { Pencil } from "lucide-react";
import { getSession, signIn, signOut } from "next-auth/react";
import Image from "next/image";
import { ChangeEvent, FormEvent, useId, useState } from "react";
import { useAuthTransition } from "./AuthTransitionProvider";

export type AuthMode = "login" | "cadastro" | "recuperar";

type RecuperarPasso = "email" | "codigo" | "senha" | "ok";

type AuthModalProps = {
    open: boolean;
    mode: AuthMode;
    onClose: () => void;
    onSwitchMode: (mode: AuthMode) => void;
    /** Após login em páginas convidado, mantém o usuário na URL atual. */
    callbackUrl?: string;
};

const inputClassName =
    "w-full px-4 py-1 border-2 border-cinza-300 rounded-full outline-none focus:outline-none focus-visible:outline-none focus:border-azul-600 font-gabarito-regular bg-white";

const btnPrimario =
    "cursor-pointer h-auto rounded-full px-6 py-3 font-gabarito-bold text-xl bg-azul-600 hover:bg-azul-600/90 border-4 border-azul-600";

function tituloDoModo(mode: AuthMode, passo: RecuperarPasso) {
    if (mode === "cadastro") return "Criar conta";
    if (mode === "login") return "Entrar";
    if (passo === "codigo") return "Código";
    if (passo === "senha") return "Nova senha";
    if (passo === "ok") return "Pronto!";
    return "Recuperar senha";
}

export default function AuthModal({ open, mode, onClose, onSwitchMode, callbackUrl }: AuthModalProps) {
    const { startAuthTransition, endAuthTransition } = useAuthTransition();
    const [nickLogin, setNickLogin] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [nome, setNome] = useState("");
    const [nick, setNick] = useState("");
    const [confirmarSenha, setConfirmarSenha] = useState("");
    const [imagem, setImagem] = useState<File | null>(null);
    const [previewImagem, setPreviewImagem] = useState<string | null>(null);
    const [erro, setErro] = useState("");
    const [info, setInfo] = useState("");
    const [podeReativar, setPodeReativar] = useState(false);
    const [carregando, setCarregando] = useState(false);
    const [recuperarPasso, setRecuperarPasso] = useState<RecuperarPasso>("email");
    const [emailRecuperar, setEmailRecuperar] = useState("");
    const [codigoOtp, setCodigoOtp] = useState("");
    const [novaSenha, setNovaSenha] = useState("");
    const [confirmarNovaSenha, setConfirmarNovaSenha] = useState("");
    const inputImagemId = useId();

    function limparFeedback() {
        setErro("");
        setInfo("");
    }

    function irPara(modeNext: AuthMode) {
        limparFeedback();
        setPodeReativar(false);
        if (modeNext === "recuperar") {
            setRecuperarPasso("email");
            setCodigoOtp("");
            setNovaSenha("");
            setConfirmarNovaSenha("");
        }
        onSwitchMode(modeNext);
    }

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

    async function prepararLoginLimpo() {
        limparStorageCliente();
        try {
            await signOut({ redirect: false });
        } catch {
            /* ignore */
        }
        await purgeCookiesAuth();
    }

    async function concluirLoginComSucesso() {
        const sessao = await getSession();
        if (process.env.NODE_ENV === "development") {
            console.info("[auth] login session", {
                id: sessao?.user?.id,
                nick: sessao?.user?.nick,
            });
        }
        sinalizarTrocaAuth(sessao?.user?.id);
        const destino = destinoPosLogin(callbackUrl);
        window.location.href = destino;
    }

    async function handleLogin(e: FormEvent) {
        e.preventDefault();
        limparFeedback();
        setPodeReativar(false);
        setCarregando(true);
        startAuthTransition();

        const senhaDigitada = password;

        try {
            await prepararLoginLimpo();

            const result = await signIn("credentials", {
                nick: nickLogin,
                password: senhaDigitada,
                redirect: false,
            });

            if (result?.error) {
                setCarregando(false);
                endAuthTransition();
                try {
                    const loginRes = await fetch("/api/login", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ nick: nickLogin, senha: senhaDigitada }),
                    });
                    const data = await loginRes.json().catch(() => null);
                    if (data?.podeReativar) {
                        setPodeReativar(true);
                        setPassword(senhaDigitada);
                        setErro(data.erro || "Conta desativada. Você pode reativá-la.");
                        return;
                    }
                    if (loginRes.status >= 500) {
                        setPassword("");
                        setErro(
                            typeof data?.erro === "string"
                                ? data.erro
                                : "Erro no servidor ao autenticar. Tente de novo em instantes.",
                        );
                        return;
                    }
                } catch {
                    /* ignore */
                }
                setPassword("");
                setErro("Nome de usuário ou senha inválidos.");
                return;
            }

            await concluirLoginComSucesso();
        } catch {
            setCarregando(false);
            endAuthTransition();
            setErro("Não foi possível entrar. Tente de novo.");
        }
    }

    async function handleReativar() {
        limparFeedback();
        setCarregando(true);
        startAuthTransition();
        try {
            const res = await fetch("/api/usuarios/reativar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nick: nickLogin, senha: password }),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok) {
                setCarregando(false);
                endAuthTransition();
                setErro(data?.erro || "Não foi possível reativar a conta.");
                return;
            }
            await prepararLoginLimpo();
            const result = await signIn("credentials", {
                nick: nickLogin,
                password,
                redirect: false,
            });
            if (result?.error) {
                setCarregando(false);
                endAuthTransition();
                setErro("Conta reativada, mas o login falhou. Tente entrar de novo.");
                return;
            }
            await concluirLoginComSucesso();
        } catch {
            setCarregando(false);
            endAuthTransition();
            setErro("Não foi possível reativar a conta.");
        }
    }

    async function handleCadastro(e: FormEvent) {
        e.preventDefault();
        limparFeedback();

        if (password !== confirmarSenha) {
            setErro("As senhas não coincidem.");
            return;
        }

        setCarregando(true);
        startAuthTransition();

        try {
            const res = await fetch("/api/cadastro", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    nome,
                    nick,
                    email,
                    senha: password,
                }),
            });

            if (!res.ok) {
                setCarregando(false);
                endAuthTransition();
                setErro("Não foi possível criar a conta. Verifique os dados.");
                return;
            }

            await prepararLoginLimpo();

            const result = await signIn("credentials", {
                nick,
                password,
                redirect: false,
            });

            if (result?.error) {
                setCarregando(false);
                endAuthTransition();
                setErro("Conta criada, mas o login falhou. Tente entrar manualmente.");
                irPara("login");
                return;
            }

            if (imagem) {
                try {
                    const imageUrl = await enviarImagem();
                    if (imageUrl) {
                        await fetch(`/api/usuarios/${encodeURIComponent(nick)}`, {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ nome, nick, email, image: imageUrl }),
                        });
                    }
                } catch {
                    /* Conta já criada — segue login mesmo se a foto falhar. */
                }
            }

            await concluirLoginComSucesso();
        } catch (uploadErro) {
            setCarregando(false);
            endAuthTransition();
            setErro(uploadErro instanceof Error ? uploadErro.message : "Erro ao criar conta.");
        }
    }

    async function handleSolicitarCodigo(e: FormEvent) {
        e.preventDefault();
        limparFeedback();
        setCarregando(true);
        try {
            const res = await fetch("/api/recuperar-senha/solicitar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: emailRecuperar }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setErro(
                    typeof data.erro === "string" ? data.erro : "Não foi possível enviar o código.",
                );
                return;
            }
            setInfo(
                typeof data.mensagem === "string"
                    ? data.mensagem
                    : "Se existir uma conta para este e-mail, enviamos um código de verificação.",
            );
            setRecuperarPasso("codigo");
        } catch {
            setErro("Não foi possível enviar o código.");
        } finally {
            setCarregando(false);
        }
    }

    async function handleVerificarCodigo(e: FormEvent) {
        e.preventDefault();
        limparFeedback();
        setCarregando(true);
        try {
            const res = await fetch("/api/recuperar-senha/verificar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: emailRecuperar, codigo: codigoOtp }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setErro(typeof data.erro === "string" ? data.erro : "Código inválido.");
                return;
            }
            setRecuperarPasso("senha");
        } catch {
            setErro("Não foi possível validar o código.");
        } finally {
            setCarregando(false);
        }
    }

    async function handleRedefinirSenha(e: FormEvent) {
        e.preventDefault();
        limparFeedback();
        if (novaSenha !== confirmarNovaSenha) {
            setErro("A senha e a confirmação não coincidem.");
            return;
        }
        setCarregando(true);
        try {
            const res = await fetch("/api/recuperar-senha/redefinir", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: emailRecuperar,
                    codigo: codigoOtp,
                    senha: novaSenha,
                    confirmarSenha: confirmarNovaSenha,
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setErro(typeof data.erro === "string" ? data.erro : "Não foi possível redefinir a senha.");
                return;
            }
            setInfo(
                typeof data.mensagem === "string"
                    ? data.mensagem
                    : "Senha redefinida com sucesso. Faça login com a nova senha.",
            );
            setRecuperarPasso("ok");
            setPassword("");
            setNovaSenha("");
            setConfirmarNovaSenha("");
        } catch {
            setErro("Não foi possível redefinir a senha.");
        } finally {
            setCarregando(false);
        }
    }

    function renderRecuperar() {
        if (recuperarPasso === "ok") {
            return (
                <div className="flex flex-col gap-4">
                    {info && <p className="text-sm text-center text-azul-900">{info}</p>}
                    <Button type="button" onClick={() => irPara("login")} className={btnPrimario}>
                        Ir para o login
                    </Button>
                </div>
            );
        }

        if (recuperarPasso === "codigo") {
            return (
                <form onSubmit={handleVerificarCodigo} className="flex flex-col gap-4">
                    {info && <p className="text-sm text-center text-azul-900">{info}</p>}
                    <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        placeholder="Código de 6 dígitos"
                        value={codigoOtp}
                        onChange={(e) => setCodigoOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        required
                        maxLength={6}
                        className={inputClassName}
                    />
                    {erro && <p className="text-red-600 text-sm text-center">{erro}</p>}
                    <Button type="submit" disabled={carregando || codigoOtp.length !== 6} className={btnPrimario}>
                        {carregando ? "Validando..." : "Validar código"}
                    </Button>
                    <p className="text-center text-sm">
                        <button
                            type="button"
                            onClick={() => {
                                limparFeedback();
                                setRecuperarPasso("email");
                            }}
                            className="text-azul-600 font-bold underline cursor-pointer"
                        >
                            Voltar
                        </button>
                    </p>
                </form>
            );
        }

        if (recuperarPasso === "senha") {
            return (
                <form onSubmit={handleRedefinirSenha} className="flex flex-col gap-4">
                    <input
                        type="password"
                        placeholder="Nova senha"
                        value={novaSenha}
                        onChange={(e) => setNovaSenha(e.target.value)}
                        required
                        minLength={6}
                        className={inputClassName}
                    />
                    <input
                        type="password"
                        placeholder="Confirmar nova senha"
                        value={confirmarNovaSenha}
                        onChange={(e) => setConfirmarNovaSenha(e.target.value)}
                        required
                        minLength={6}
                        className={inputClassName}
                    />
                    {erro && <p className="text-red-600 text-sm text-center">{erro}</p>}
                    <Button type="submit" disabled={carregando} className={btnPrimario}>
                        {carregando ? "Salvando..." : "Redefinir senha"}
                    </Button>
                </form>
            );
        }

        return (
            <form onSubmit={handleSolicitarCodigo} className="flex flex-col gap-4">
                <p className="text-sm text-center text-cinza-700">
                    Informe o e-mail da conta. Enviaremos um código de verificação.
                </p>
                <input
                    type="email"
                    placeholder="Email"
                    value={emailRecuperar}
                    onChange={(e) => setEmailRecuperar(e.target.value)}
                    required
                    autoComplete="email"
                    className={inputClassName}
                />
                {erro && <p className="text-red-600 text-sm text-center">{erro}</p>}
                <Button type="submit" disabled={carregando} className={btnPrimario}>
                    {carregando ? "Enviando..." : "Enviar código"}
                </Button>
                <p className="text-center text-sm">
                    Lembrou a senha?{" "}
                    <button
                        type="button"
                        onClick={() => irPara("login")}
                        className="text-azul-600 font-bold underline cursor-pointer"
                    >
                        Entrar
                    </button>
                </p>
            </form>
        );
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(isOpen) => {
                if (!isOpen) {
                    onClose();
                }
            }}
        >
            <DialogContent className="bg-background sm:max-w-md gap-4">
                <DialogHeader className="items-center text-center gap-4">
                    <Image src="/assets/images/Vector.svg" width={80} height={65} alt="Logo da opinioteca" />
                    <DialogTitle className="font-gabarito-bold text-3xl text-azul-900">
                        <AnimatePresence mode="wait">
                            <motion.span
                                key={`${mode}-${recuperarPasso}`}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                transition={{ duration: 0.18 }}
                                className="inline-block"
                            >
                                {tituloDoModo(mode, recuperarPasso)}
                            </motion.span>
                        </AnimatePresence>
                    </DialogTitle>
                </DialogHeader>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={`${mode}-${recuperarPasso}`}
                        initial={{ opacity: 0, x: mode === "login" ? -12 : 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: mode === "login" ? 12 : -12 }}
                        transition={{ duration: 0.22, ease: "easeOut" }}
                    >
                        {mode === "login" ? (
                            <form onSubmit={handleLogin} className="flex flex-col gap-4">
                                <input
                                    type="text"
                                    placeholder="Nome de usuário"
                                    value={nickLogin}
                                    onChange={(e) => setNickLogin(e.target.value)}
                                    required
                                    autoComplete="username"
                                    className={inputClassName}
                                />
                                <input
                                    type="password"
                                    placeholder="Senha"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className={inputClassName}
                                />
                                {erro && <p className="text-red-600 text-sm text-center">{erro}</p>}
                                {podeReativar && (
                                    <Button
                                        type="button"
                                        disabled={carregando}
                                        onClick={() => void handleReativar()}
                                        className="cursor-pointer h-auto rounded-full px-6 py-3 font-gabarito-bold text-xl bg-amber-500 hover:bg-amber-500/90 border-4 border-amber-500"
                                    >
                                        {carregando ? "Reativando..." : "Reativar conta"}
                                    </Button>
                                )}
                                <Button type="submit" disabled={carregando} className={btnPrimario}>
                                    {carregando ? "Entrando..." : "Entrar"}
                                </Button>
                                <div className="flex w-full justify-between">
                                <p className="text-center text-sm">
                                    <button
                                        type="button"
                                        onClick={() => irPara("recuperar")}
                                        className="text-azul-600 font-bold underline cursor-pointer"
                                    >
                                        Esqueceu a senha?
                                    </button>
                                </p>
                                <p className="text-center text-sm">
                                    Não tem conta?{" "}
                                    <button
                                        type="button"
                                        onClick={() => irPara("cadastro")}
                                        className="text-azul-600 font-bold underline cursor-pointer"
                                    >
                                        Criar conta
                                    </button>
                                </p>
                                </div>
                            </form>
                        ) : mode === "recuperar" ? (
                            renderRecuperar()
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
                                                accept="image/jpeg,image/png,image/webp"
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
                                    onChange={(e) => setNome(e.target.value)}
                                    required
                                    className={inputClassName}
                                />
                                <input
                                    type="text"
                                    placeholder="Nick"
                                    value={nick}
                                    onChange={(e) => setNick(e.target.value)}
                                    required
                                    className={inputClassName}
                                />
                                <input
                                    type="email"
                                    placeholder="Email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className={inputClassName}
                                />
                                <input
                                    type="password"
                                    placeholder="Senha"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className={inputClassName}
                                />
                                <input
                                    type="password"
                                    placeholder="Confirmar senha"
                                    value={confirmarSenha}
                                    onChange={(e) => setConfirmarSenha(e.target.value)}
                                    required
                                    className={inputClassName}
                                />
                                {erro && <p className="text-red-600 text-sm text-center">{erro}</p>}
                                <Button type="submit" disabled={carregando} className={btnPrimario}>
                                    {carregando ? "Criando..." : "Criar conta"}
                                </Button>
                                <p className="text-center text-sm">
                                    Já tem conta?{" "}
                                    <button
                                        type="button"
                                        onClick={() => irPara("login")}
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
