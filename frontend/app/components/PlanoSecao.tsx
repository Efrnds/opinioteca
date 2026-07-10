"use client";

import AvisoAssinaturaExpirando from "@/app/components/AvisoAssinaturaExpirando";
import { usePlano } from "@/app/components/PlanoProvider";
import { formatarPreco, rotuloValidadePlano } from "@/types/plano";
import { Check, Crown, Sparkles } from "lucide-react";

const FEATURES_TOP = [
    "6 templates de resenha em português",
    "Badge TOP no perfil e posts",
    "Estatísticas de leitura do mês",
    "Histórico de leitura completo",
    "Editar resenhas após publicar",
];

const FEATURES_PRO = [
    "Tudo do OpinioTop",
    "Modo Zen (leitura sem distrações)",
    "Meta de leitura com progresso",
    "GIF como foto de perfil",
    "OpinioWrapped: seu ano em leitura",
    "Badge PRO no perfil",
];

function PlanoCard({
    nome,
    preco,
    destaque,
    features,
    icone: Icone,
    corBorda,
    corFundo,
}: {
    nome: string;
    preco: number;
    destaque?: boolean;
    features: string[];
    icone: typeof Sparkles;
    corBorda: string;
    corFundo: string;
}) {
    return (
        <div
            className={`relative flex flex-col rounded-2xl border-2 p-5 ${corBorda} ${corFundo} ${
                destaque ? "shadow-lg ring-2 ring-azul-200" : ""
            }`}
        >
            {destaque ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-azul-600 px-3 py-0.5 font-gabarito-bold text-xs text-white">
                    Mais popular
                </span>
            ) : null}
            <div className="mb-3 flex items-center gap-2">
                <Icone className="h-5 w-5 text-azul-700" />
                <h3 className="font-gabarito-bold text-xl text-azul-900">{nome}</h3>
            </div>
            <p className="mb-4 font-gabarito-bold text-3xl text-azul-900">
                {formatarPreco(preco)}
                <span className="font-gabarito-regular text-sm text-cinza-600">/mês</span>
            </p>
            <ul className="mb-6 flex flex-1 flex-col gap-2">
                {features.map((f) => (
                    <li key={f} className="flex items-start gap-2 font-gabarito-regular text-sm text-azul-900">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-azul-600" />
                        {f}
                    </li>
                ))}
            </ul>
            <button
                type="button"
                disabled
                className="w-full cursor-not-allowed rounded-full border-2 border-cinza-300 bg-cinza-100 py-2.5 font-gabarito-medium text-sm text-cinza-600"
            >
                Em breve
            </button>
        </div>
    );
}

export default function PlanoSecao() {
    const { plano, catalogo, carregando } = usePlano();

    const top = catalogo.find((p) => p.codigo === "opiniotop");
    const pro = catalogo.find((p) => p.codigo === "opiniopro");

    return (
        <div className="flex flex-col gap-6">
            {plano ? (
                <div className="rounded-xl border border-azul-100 bg-azul-50/50 px-4 py-3">
                    <p className="font-gabarito-medium text-sm text-azul-900">
                        Seu plano atual:{" "}
                        <span className="font-gabarito-bold">{plano.nome}</span>
                        {!plano.ativo && plano.codigo !== "gratuito" ? (
                            <span className="ml-2 text-red-600">(expirado)</span>
                        ) : null}
                    </p>
                    {rotuloValidadePlano(plano) ? (
                        <p className="mt-1 font-gabarito-regular text-xs text-cinza-700">
                            {plano.vitalicia ? (
                                <span className="inline-flex items-center rounded-full bg-violet-100 px-2 py-0.5 font-gabarito-medium text-violet-800">
                                    Vitalícia
                                </span>
                            ) : (
                                rotuloValidadePlano(plano)
                            )}
                        </p>
                    ) : null}
                </div>
            ) : carregando ? (
                <p className="font-gabarito-regular text-sm text-cinza-600">Carregando plano…</p>
            ) : null}

            <AvisoAssinaturaExpirando dismissivel={false} variante="nota" />

            <p className="font-gabarito-regular text-cinza-700">
                Pagamento online em breve. Por enquanto, assinaturas são ativadas manualmente pela equipe
                Opinoteca.
            </p>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <PlanoCard
                    nome="OpinioTop"
                    preco={top?.precoMensal ?? 9.99}
                    features={FEATURES_TOP}
                    icone={Sparkles}
                    corBorda="border-azul-200"
                    corFundo="bg-white"
                    destaque
                />
                <PlanoCard
                    nome="OpinioPro"
                    preco={pro?.precoMensal ?? 19.99}
                    features={FEATURES_PRO}
                    icone={Crown}
                    corBorda="border-amber-200"
                    corFundo="bg-amber-50/30"
                />
            </div>

            <p className="text-center font-gabarito-regular text-xs text-cinza-600">
                Interessado? Entre em contato ou peça a um administrador para ativar seu plano no painel admin.
            </p>
        </div>
    );
}
