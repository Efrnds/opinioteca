import { permanentRedirect } from "next/navigation";

type Params = { params: Promise<{ volumeId: string }> };

export default async function LivroPesquisaRedirect({ params }: Params) {
    const { volumeId } = await params;
    permanentRedirect(`/livros/${encodeURIComponent(volumeId)}`);
}
