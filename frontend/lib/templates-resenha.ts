export type TemplateResenha = {
    id: number;
    nome: string;
    descricao: string;
    texto: string;
};

export const TEMPLATES_RESENHA: TemplateResenha[] = [
    {
        id: 1,
        nome: "Emoção pura",
        descricao: "Para quando o livro mexeu com você de verdade",
        texto: `Este livro me pegou de um jeito que eu não esperava.

Ainda estou processando [o final / aquela cena / o arco do personagem principal] — e acho que isso já diz muito sobre a força da narrativa.

O que mais me marcou foi [momento ou tema, sem spoilers]. Fiquei com a sensação de [emoção] por dias.

Nota pessoal: não é leitura leve, mas é intensa no melhor sentido.`,
    },
    {
        id: 2,
        nome: "Análise crítica",
        descricao: "Olhar atento sobre ritmo, personagens e proposta",
        texto: `Pontos fortes:
• [Ex.: construção de mundo / diálogos / prosa]
• [Ex.: desenvolvimento de personagem]

Pontos fracos:
• [Ex.: ritmo irregular / desfechos apressados]

O autor propõe [tema central] e, no geral, entrega uma leitura [coerente / instigante / irregular]. A nota reflete o equilíbrio entre o que funcionou e o que poderia ser mais lapidado.`,
    },
    {
        id: 3,
        nome: "Opinião rápida",
        descricao: "Direto ao ponto, sem enrolação",
        texto: `Leitura [rápida / densa / surpreendente].

Gostei de: [um ponto].
Não curti tanto: [outro ponto].

Vale a pena? [Sim / Depende / Só se você gosta de X].`,
    },
    {
        id: 4,
        nome: "Recomendação",
        descricao: "Para quem quer indicar com clareza",
        texto: `Recomendo este livro para quem:
✓ Gosta de [gênero ou tom]
✓ Aprecia histórias com [elemento: mistério, romance, crítica social…]
✓ Não se importa com [ritmo lento / narrativa fragmentada / etc.]

É uma boa porta de entrada para [autor / série / tema]. Se você curtiu [livro parecido], provavelmente vai gostar deste também.`,
    },
    {
        id: 5,
        nome: "Comparativo",
        descricao: "Situa o livro em relação a outros",
        texto: `Este livro me lembrou [obra ou autor] no tom, mas com [diferença marcante].

Enquanto [referência] aposta em [característica], aqui o destaque vai para [outro aspecto].

Para fãs de [gênero/referência]: [vale muito / pode dividir opiniões].
Para quem não conhece o autor: comece por este ou por [alternativa]? [sua opinião].`,
    },
    {
        id: 6,
        nome: "Estruturado sem spoilers",
        descricao: "Formato seguro para não estragar a leitura",
        texto: `▸ Premissa (sem spoilers)
[Uma ou duas frases sobre o enredo inicial.]

▸ O que funcionou
[Estilo, atmosfera, personagens — sem revelar viradas.]

▸ Para quem é
Leitores que buscam [experiência] e toleram [tom/ritmo].

▸ Em resumo
[Frase final com sua impressão geral, mantendo o mistério.]`,
    },
];
