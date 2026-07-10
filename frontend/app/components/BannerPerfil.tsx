"use client";

import { mediaUrl } from "@/lib/media";
import { enviarImagemBanner, validarArquivoBanner } from "@/lib/upload";
import { Camera, Loader2, Move } from "lucide-react";
import Image from "next/image";
import { useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

type BannerPerfilProps = {
    nome: string;
    nick: string;
    email: string;
    image?: string;
    banner?: string;
    bannerPosicao?: string;
    editavel?: boolean;
    onAtualizado?: (dados: { banner?: string; bannerPosicao?: string }) => void;
};

type Ponto = { x: number; y: number };

const POSICAO_PADRAO: Ponto = { x: 50, y: 50 };

function parsePosicao(posicao?: string): Ponto {
    if (!posicao) return { ...POSICAO_PADRAO };
    const match = posicao.trim().match(/^([\d.]+)%\s+([\d.]+)%$/);
    if (!match) return { ...POSICAO_PADRAO };
    return {
        x: Math.min(100, Math.max(0, Number(match[1]))),
        y: Math.min(100, Math.max(0, Number(match[2]))),
    };
}

function formatPosicao(ponto: Ponto): string {
    return `${Math.round(ponto.x)}% ${Math.round(ponto.y)}%`;
}

function limitar(valor: number, min: number, max: number) {
    return Math.min(max, Math.max(min, valor));
}

export default function BannerPerfil({
    nome,
    nick,
    email,
    image,
    banner,
    bannerPosicao,
    editavel = false,
    onAtualizado,
}: BannerPerfilProps) {
    const inputId = useId();
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const arrastoRef = useRef<{
        pointerId: number;
        startX: number;
        startY: number;
        origX: number;
        origY: number;
    } | null>(null);

    const [enviando, setEnviando] = useState(false);
    const [salvandoPosicao, setSalvandoPosicao] = useState(false);
    const [erro, setErro] = useState("");
    const [reposicionando, setReposicionando] = useState(false);
    const [posicao, setPosicao] = useState<Ponto>(() => parsePosicao(bannerPosicao));
    const [posicaoSalva, setPosicaoSalva] = useState<Ponto>(() => parsePosicao(bannerPosicao));

    const bannerSrc = mediaUrl(banner);
    const objectPosition = formatPosicao(posicao);

    useEffect(() => {
        if (reposicionando) return;
        const parsed = parsePosicao(bannerPosicao);
        setPosicao(parsed);
        setPosicaoSalva(parsed);
    }, [bannerPosicao, reposicionando]);

    async function persistirPerfil(payload: { banner?: string; bannerPosicao?: string }) {
        const res = await fetch(`/api/usuarios/${encodeURIComponent(nick)}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                nome,
                nick,
                email,
                image,
                banner: payload.banner ?? banner,
                bannerPosicao: payload.bannerPosicao,
            }),
        });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error((data as { erro?: string }).erro || "Não foi possível atualizar o banner.");
        }
    }

    async function handleArquivo(arquivo: File) {
        const erroValidacao = validarArquivoBanner(arquivo);
        if (erroValidacao) {
            setErro(erroValidacao);
            return;
        }

        setEnviando(true);
        setErro("");
        try {
            const novaUrl = await enviarImagemBanner(arquivo);
            const posicaoInicial = formatPosicao(POSICAO_PADRAO);
            await persistirPerfil({ banner: novaUrl, bannerPosicao: posicaoInicial });
            setPosicao(POSICAO_PADRAO);
            setPosicaoSalva(POSICAO_PADRAO);
            setReposicionando(true);
            onAtualizado?.({ banner: novaUrl, bannerPosicao: posicaoInicial });
        } catch (uploadErro) {
            setErro(uploadErro instanceof Error ? uploadErro.message : "Erro ao enviar banner.");
        } finally {
            setEnviando(false);
        }
    }

    function iniciarReposicao() {
        setErro("");
        setPosicao(posicaoSalva);
        setReposicionando(true);
    }

    function cancelarReposicao() {
        setPosicao(posicaoSalva);
        setReposicionando(false);
        setErro("");
        arrastoRef.current = null;
    }

    async function salvarReposicao() {
        setSalvandoPosicao(true);
        setErro("");
        try {
            const valor = formatPosicao(posicao);
            await persistirPerfil({ banner, bannerPosicao: valor });
            setPosicaoSalva(posicao);
            setReposicionando(false);
            onAtualizado?.({ banner, bannerPosicao: valor });
        } catch (saveErro) {
            setErro(saveErro instanceof Error ? saveErro.message : "Erro ao salvar posição.");
        } finally {
            setSalvandoPosicao(false);
        }
    }

    function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
        if (!reposicionando || !bannerSrc) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        arrastoRef.current = {
            pointerId: e.pointerId,
            startX: e.clientX,
            startY: e.clientY,
            origX: posicao.x,
            origY: posicao.y,
        };
    }

    function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
        const arrasto = arrastoRef.current;
        const container = containerRef.current;
        if (!arrasto || arrasto.pointerId !== e.pointerId || !container) return;
        const rect = container.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;
        const dx = ((e.clientX - arrasto.startX) / rect.width) * 100;
        const dy = ((e.clientY - arrasto.startY) / rect.height) * 100;
        setPosicao({
            x: limitar(arrasto.origX - dx, 0, 100),
            y: limitar(arrasto.origY - dy, 0, 100),
        });
    }

    function onPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
        if (arrastoRef.current?.pointerId === e.pointerId) {
            arrastoRef.current = null;
        }
    }

    const imagemBanner = bannerSrc ? (
        <Image
            src={bannerSrc}
            alt={`Banner de ${nome || nick}`}
            fill
            priority
            draggable={false}
            className="object-cover select-none"
            style={{ objectPosition }}
            sizes="(max-width: 768px) 100vw, 768px"
        />
    ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-azul-900 via-azul-700 to-azul-600" />
    );

    return (
        <div className={`relative ${reposicionando ? "z-20" : "z-0"}`}>
            <div
                ref={containerRef}
                className={`relative h-32 w-full overflow-hidden ${
                    reposicionando ? "cursor-grab active:cursor-grabbing touch-none" : ""
                }`}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
            >
                {imagemBanner}

                {editavel && !reposicionando && (
                    <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/35 opacity-0 transition-opacity hover:opacity-100 focus-within:opacity-100">
                        {enviando ? (
                            <Loader2 className="h-7 w-7 animate-spin text-white" />
                        ) : (
                            <>
                                <label
                                    htmlFor={inputId}
                                    className="flex cursor-pointer items-center gap-2 rounded-full bg-azul-600 px-3 py-1.5 font-gabarito-bold text-xs text-white shadow-sm"
                                    title="Alterar banner do perfil"
                                >
                                    <Camera className="h-4 w-4" />
                                    Alterar banner
                                </label>
                                {bannerSrc && (
                                    <button
                                        type="button"
                                        onClick={iniciarReposicao}
                                        className="flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 font-gabarito-bold text-xs text-azul-900 shadow-sm"
                                    >
                                        <Move className="h-4 w-4" />
                                        Reposicionar
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                )}

                {reposicionando && (
                    <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/55 to-transparent px-3 py-2">
                        <p className="font-gabarito-regular text-xs text-white">
                            Arraste a imagem para definir a posição
                        </p>
                    </div>
                )}
            </div>

            {editavel && (
                <input
                    ref={inputRef}
                    id={inputId}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    disabled={enviando || reposicionando || salvandoPosicao}
                    onChange={(e) => {
                        const arquivo = e.target.files?.[0];
                        if (arquivo) void handleArquivo(arquivo);
                        e.target.value = "";
                    }}
                />
            )}

            {reposicionando && (
                <div className="absolute bottom-2 right-2 z-10 flex gap-2">
                    <button
                        type="button"
                        onClick={cancelarReposicao}
                        disabled={salvandoPosicao}
                        className="rounded-full bg-white/95 px-3 py-1.5 font-gabarito-bold text-xs text-azul-900 shadow-sm disabled:opacity-60"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={() => void salvarReposicao()}
                        disabled={salvandoPosicao}
                        className="flex items-center gap-1.5 rounded-full bg-azul-600 px-3 py-1.5 font-gabarito-bold text-xs text-white shadow-sm disabled:opacity-60"
                    >
                        {salvandoPosicao && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        Salvar
                    </button>
                </div>
            )}

            {erro && (
                <p className="absolute bottom-1 left-2 right-2 z-10 rounded bg-white/90 px-2 py-1 font-gabarito-regular text-[10px] text-red-600">
                    {erro}
                </p>
            )}
        </div>
    );
}
