"use client";

import type { CSSProperties } from "react";
import type { OpinioWrapped } from "@/types/wrapped";
import { forwardRef } from "react";

import {
    type WrappedShareTema,
    type WrappedShareTemaId,
    accentCardStyle,
    anoDoPeriodo,
    chipStyle,
    formatarMesCurto,
    formatarPeriodoShare,
    getWrappedShareTema,
    heroRingInnerStyle,
    heroRingStyle,
    sparklesBadgeStyle,
} from "@/lib/wrapped-visuals";
import { WRAPPED_CARD_HEIGHT, WRAPPED_CARD_WIDTH } from "@/lib/wrapped-share";

type WrappedShareCardProps = {
    dados: OpinioWrapped;
    nick: string;
    tema?: WrappedShareTemaId;
};

function IconSparkles({ size = 88, color }: { size?: number; color: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
                d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function IconBookOpen({ size = 112, color }: { size?: number; color: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
                d="M12 7v14M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function ShareDecorations({ ghost, tema }: { ghost: string; tema: WrappedShareTema }) {
    const layer: CSSProperties = { pointerEvents: "none", position: "absolute", inset: 0, overflow: "hidden" };

    return (
        <div style={layer}>
            <div
                style={{
                    position: "absolute",
                    left: -72,
                    top: -96,
                    width: 280,
                    height: 280,
                    borderRadius: "50%",
                    background: tema.orb1,
                }}
            />
            <div
                style={{
                    position: "absolute",
                    right: -96,
                    top: 120,
                    width: 320,
                    height: 320,
                    borderRadius: "50%",
                    background: tema.orb2,
                }}
            />
            <div
                style={{
                    position: "absolute",
                    bottom: 160,
                    left: -48,
                    width: 224,
                    height: 224,
                    borderRadius: "50%",
                    background: tema.orb3,
                }}
            />
            <div
                style={{
                    position: "absolute",
                    right: -32,
                    bottom: -80,
                    width: 304,
                    height: 304,
                    borderRadius: "50%",
                    background: tema.orb4,
                }}
            />

            <div
                style={{
                    position: "absolute",
                    right: 40,
                    top: 240,
                    width: 56,
                    height: 56,
                    borderRadius: 16,
                    border: `1px solid ${tema.border}`,
                    background: tema.surface,
                    transform: "rotate(12deg)",
                    boxShadow: `0 6px 16px ${tema.shadow}`,
                }}
            />
            <div
                style={{
                    position: "absolute",
                    left: 28,
                    top: 368,
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    border: `1px solid ${tema.border}`,
                    background: tema.surface,
                }}
            />
            <div
                style={{
                    position: "absolute",
                    right: 48,
                    bottom: 336,
                    width: 24,
                    height: 24,
                    border: `1px solid ${tema.accentSoft}`,
                    background: tema.orb1,
                    transform: "rotate(45deg)",
                }}
            />

            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    opacity: 0.18,
                    backgroundImage: `radial-gradient(circle, ${tema.border} 1px, transparent 1px)`,
                    backgroundSize: "28px 28px",
                }}
            />

            <p
                style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    transform: "translate(-50%, -42%)",
                    margin: 0,
                    fontFamily: "Gabarito-Bold, sans-serif",
                    fontSize: 380,
                    lineHeight: 1,
                    letterSpacing: "-0.04em",
                    color: tema.ghost,
                    userSelect: "none",
                }}
            >
                {ghost}
            </p>

            <div
                style={{
                    position: "absolute",
                    left: "50%",
                    top: "46%",
                    transform: "translateX(-50%)",
                    display: "flex",
                    alignItems: "flex-end",
                    gap: 4,
                    opacity: 0.45,
                }}
            >
                {[0, 1, 2].map((i) => (
                    <div
                        key={i}
                        style={{
                            borderRadius: 8,
                            border: `1px solid ${tema.border}`,
                            background: `linear-gradient(to bottom, ${tema.surface}, ${tema.surfaceAlt})`,
                            width: 28 + i * 6,
                            height: 52 + i * 14,
                        }}
                    />
                ))}
            </div>
        </div>
    );
}

function InfoChip({ valor, rotulo, tema }: { valor: string; rotulo: string; tema: WrappedShareTema }) {
    return (
        <div style={chipStyle(tema)}>
            <p
                style={{
                    margin: 0,
                    fontFamily: "Gabarito-Bold, sans-serif",
                    fontSize: 44,
                    lineHeight: 1,
                    color: tema.text,
                    textAlign: "center",
                    wordBreak: "break-word",
                }}
            >
                {valor}
            </p>
            <p
                style={{
                    margin: "8px 0 0",
                    fontSize: 22,
                    textTransform: "uppercase",
                    letterSpacing: "0.22em",
                    color: tema.textMuted,
                    textAlign: "center",
                }}
            >
                {rotulo}
            </p>
        </div>
    );
}

function BottomInfoStrip({ items, tema }: { items: { valor: string; rotulo: string }[]; tema: WrappedShareTema }) {
    return (
        <div style={{ display: "flex", width: "100%", gap: 16 }}>
            {items.map((item) => (
                <InfoChip key={item.rotulo} valor={item.valor} rotulo={item.rotulo} tema={tema} />
            ))}
        </div>
    );
}

const WrappedShareCard = forwardRef<HTMLDivElement, WrappedShareCardProps>(function WrappedShareCard(
    { dados, nick, tema: temaId },
    ref,
) {
    const tema = getWrappedShareTema(temaId);
    const paginas = (dados.paginas_lidas ?? 0).toLocaleString("pt-BR");
    const livros = dados.livros_finalizados ?? 0;
    const sequencia = dados.maior_sequencia ?? 0;
    const diasAtivos = dados.dias_com_leitura ?? 0;
    const generoTop = dados.genero_favorito ?? dados.generos_favoritos?.[0]?.nome ?? "Variado";
    const destaque = dados.livro_destaque_detalhe?.titulo ?? dados.livro_destaque ?? "-";
    const mesTop = formatarMesCurto(dados.mes_mais_ativo);
    const paginasMes = (dados.paginas_mes_ativo ?? 0).toLocaleString("pt-BR");
    const anoGhost = anoDoPeriodo(dados.periodo_fim);
    const periodo = formatarPeriodoShare(dados.periodo_inicio, dados.periodo_fim);

    return (
        <div
            ref={ref}
            aria-hidden
            style={{
                // Keep in-viewport + painted for html-to-image, but visually tiny so it never flashes.
                position: "fixed",
                top: 0,
                left: 0,
                width: WRAPPED_CARD_WIDTH,
                height: WRAPPED_CARD_HEIGHT,
                transform: "scale(0.01)",
                transformOrigin: "top left",
                zIndex: -1,
                opacity: 1,
                pointerEvents: "none",
                overflow: "hidden",
            }}
        >
            <div
                style={{
                    position: "relative",
                    display: "flex",
                    flexDirection: "column",
                    width: WRAPPED_CARD_WIDTH,
                    height: WRAPPED_CARD_HEIGHT,
                    padding: "72px 56px 56px",
                    boxSizing: "border-box",
                    color: tema.text,
                    background: tema.gradientCss,
                    fontFamily: "Gabarito-Regular, sans-serif",
                    overflow: "hidden",
                }}
            >
                <ShareDecorations ghost={anoGhost} tema={tema} />

                <div
                    style={{
                        pointerEvents: "none",
                        position: "absolute",
                        inset: 24,
                        borderRadius: 64,
                        border: `1px solid ${tema.border}`,
                    }}
                />

                <div style={{ position: "relative", zIndex: 10 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24 }}>
                        <p
                            style={{
                                margin: 0,
                                fontSize: 24,
                                fontWeight: 500,
                                textTransform: "uppercase",
                                letterSpacing: "0.28em",
                                color: tema.textMuted,
                            }}
                        >
                            {periodo}
                        </p>
                        <p style={{ margin: 0, fontSize: 26, color: tema.accentSoft }}>OpinioWrapped</p>
                    </div>
                </div>

                <div
                    style={{
                        position: "relative",
                        zIndex: 10,
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        textAlign: "center",
                        padding: "32px 8px",
                        gap: 48,
                    }}
                >
                    <div style={sparklesBadgeStyle(tema)}>
                        <IconSparkles size={88} color={tema.accent} />
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                        <h2
                            style={{
                                margin: 0,
                                maxWidth: "92%",
                                fontFamily: "Gabarito-Bold, sans-serif",
                                fontSize: 148,
                                lineHeight: 0.92,
                                letterSpacing: "-0.02em",
                                color: tema.accent,
                            }}
                        >
                            {paginas}
                        </h2>
                        <p
                            style={{
                                margin: 0,
                                maxWidth: "88%",
                                fontSize: 34,
                                lineHeight: 1.45,
                                color: tema.text,
                            }}
                        >
                            páginas lidas nos últimos 12 meses.
                        </p>
                    </div>

                    <div style={heroRingStyle(288, tema)}>
                        <div style={heroRingInnerStyle(288, tema)} />
                        <IconBookOpen size={112} color={tema.accent} />
                    </div>

                    <BottomInfoStrip
                        tema={tema}
                        items={[
                            { valor: String(livros), rotulo: `livro${livros === 1 ? "" : "s"}` },
                            { valor: String(sequencia), rotulo: "dias seguidos" },
                            { valor: String(diasAtivos), rotulo: "dias ativos" },
                        ]}
                    />
                </div>

                <div style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", gap: 20 }}>
                    <BottomInfoStrip
                        tema={tema}
                        items={[
                            { valor: generoTop, rotulo: "gênero favorito" },
                            { valor: mesTop, rotulo: "melhor mês" },
                        ]}
                    />

                    <div style={accentCardStyle(tema)}>
                        <p
                            style={{
                                margin: 0,
                                fontSize: 22,
                                textTransform: "uppercase",
                                letterSpacing: "0.24em",
                                color: tema.textMuted,
                            }}
                        >
                            páginas no pico
                        </p>
                        <p
                            style={{
                                margin: "12px 0 0",
                                fontFamily: "Gabarito-Bold, sans-serif",
                                fontSize: 80,
                                lineHeight: 1,
                                color: tema.accent,
                            }}
                        >
                            {paginasMes}
                        </p>
                    </div>

                    <div style={{ ...accentCardStyle(tema), textAlign: "left" as const }}>
                        <p
                            style={{
                                margin: 0,
                                fontSize: 22,
                                textTransform: "uppercase",
                                letterSpacing: "0.24em",
                                color: tema.textMuted,
                            }}
                        >
                            livro destaque
                        </p>
                        <p
                            style={{
                                margin: "16px 0 0",
                                fontFamily: "Gabarito-Bold, sans-serif",
                                fontSize: 48,
                                lineHeight: 1.1,
                                color: tema.text,
                            }}
                        >
                            {destaque}
                        </p>
                    </div>

                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 24,
                            paddingTop: 16,
                            borderTop: `1px solid ${tema.border}`,
                        }}
                    >
                        <div>
                            <p
                                style={{
                                    margin: 0,
                                    fontFamily: "Gabarito-Bold, sans-serif",
                                    fontSize: 36,
                                    color: tema.text,
                                }}
                            >
                                @{nick}
                            </p>
                            <p style={{ margin: "6px 0 0", fontSize: 26, color: tema.textMuted }}>Opinoteca</p>
                        </div>
                        <div
                            style={{
                                borderRadius: 999,
                                padding: "14px 28px",
                                background: tema.accent,
                                fontFamily: "Gabarito-Bold, sans-serif",
                                fontSize: 26,
                                color: tema.ctaText,
                            }}
                        >
                            12 meses
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

export default WrappedShareCard;
