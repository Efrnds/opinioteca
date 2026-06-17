import Landing from "./components/Landing";

type HomeProps = {
    searchParams: Promise<{ auth?: string; callbackUrl?: string }>;
};

export default async function Home({ searchParams }: HomeProps) {
    const params = await searchParams;

    return (
        <Landing
            initialAuth={params.auth}
            callbackUrl={params.callbackUrl ?? "/home"}
        />
    );
}
