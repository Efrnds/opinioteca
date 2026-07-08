import { temPlanoPro as temPlanoProDeId } from "@/lib/plano";
import type { PlanoStatus } from "@/types/plano";

/** Detecta URLs de avatar animado (GIF). */
export function ehAvatarGif(url?: string | null): boolean {
    if (!url) return false;
    return /\.gif(\?|#|$)/i.test(url);
}

/**
 * GIF de perfil é exclusivo do OpinioPro. A URL permanece no banco quando o plano
 * expira ou é revogado; na interface exibimos avatar estático (iniciais) em vez do
 * GIF animado, evitando imagem quebrada e reativando a animação ao reassinar Pro.
 */
export function podeExibirAvatarGif(
    imageUrl?: string | null,
    assinaturaId?: number,
    plano?: PlanoStatus,
    temPlanoPro?: boolean,
): boolean {
    if (!ehAvatarGif(imageUrl)) return true;
    if (temPlanoPro != null) return temPlanoPro;
    if (plano) return plano.temPlanoPro;
    return temPlanoProDeId(assinaturaId, plano);
}
