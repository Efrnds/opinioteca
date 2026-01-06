import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="lg:flex grid grid-cols-1 justify-between h-screen w-screen lg:p-36 p-18">
      <section className="flex flex-col my-auto gap-12">
        <div className="flex flex-col gap-2">
          <Image
            src={"/assets/images/Vector.svg"}
            width={200}
            height={163}
            alt="Logo da opinioteca"
          ></Image>
          <h1 className="font-gabarito-bold text-5xl">opinioteca</h1>
        </div>
        <p className="font-inria-regular text-2xl">
          &quot;A alma é essa coisa que nos pergunta se a alma existe&quot;{" "}
          <br />
          Mario Quintana
        </p>
      </section>
      <section className="flex flex-col my-auto gap-16">
        <div className="flex flex-col gap-2 5">
          <Link
            href=""
            className="flex text-center gap-2 px-6 py-2 rounded-full text-white font-bold text-2xl bg-azul-600 border-4 border-azul-600"
          >
            <Image
              src="/assets/images/google.svg"
              width={24}
              height={24}
              alt=""
            />{" "}
            Entrar com o google
          </Link>
          <div className="flex gap-2 align-middle">
            <hr className="my-auto border flex-1" />
            <p>ou</p>
            <hr className="my-auto border flex-1" />
          </div>
          <Link
            href=""
            className="flex gap-2 justify-center px-6 py-2 rounded-full text-white font-bold text-2xl bg-azul-600 border-4 border-azul-600"
          >
            Criar conta
          </Link>
        </div>
        <div className="flex flex-col gap-2">
          <p className="font-bold text-2xl">Já possui uma conta?</p>
          <Link
            href=""
            className="flex gap-2 justify-center px-7 py-2.5 rounded-full text-azul-600 bg-background font-bold text-2xl border-4"
          >
            Entrar
          </Link>
        </div>
      </section>
    </div>
  );
}
