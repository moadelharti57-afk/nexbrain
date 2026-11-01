import Link from "next/link";

const AGENTS = [
  ["01", "Explorateur", "Détecte les problèmes"],
  ["02", "Innovateur", "Imagine des solutions"],
  ["03", "Analyste", "Étudie le marché"],
  ["04", "Technique", "Estime effort, coût, délai"],
  ["05", "Décideur", "Classe, justifie, recommande"],
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center gap-10 px-6 py-16">
      <div className="space-y-4">
        <p className="text-sm font-semibold tracking-widest text-violet-600">NEXBRAIN</p>
        <h1 className="text-4xl font-bold sm:text-5xl">Des problématiques aux projets réalisables.</h1>
        <p className="max-w-2xl text-lg text-neutral-500">
          Explorer → imaginer → analyser → estimer → décider. NexBrain vous aide à choisir une idée à tester ;
          il ne garantit pas sa réussite commerciale.
        </p>
        <div className="flex gap-3 pt-2">
          <Link href="/register" className="rounded-lg bg-violet-600 px-5 py-2.5 font-medium text-white hover:bg-violet-700">
            Créer un compte
          </Link>
          <Link href="/login" className="rounded-lg border border-neutral-300 px-5 py-2.5 font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900">
            Se connecter
          </Link>
        </div>
      </div>
      <ol className="grid gap-3 sm:grid-cols-5">
        {AGENTS.map(([n, name, role]) => (
          <li key={n} className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
            <span className="text-xs text-neutral-400">{n}</span>
            <p className="font-semibold">{name}</p>
            <p className="text-sm text-neutral-500">{role}</p>
          </li>
        ))}
      </ol>
    </main>
  );
}
