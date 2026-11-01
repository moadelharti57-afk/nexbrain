import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <p className="text-sm font-semibold tracking-widest text-violet-600">404</p>
      <h1 className="text-2xl font-bold">Page introuvable</h1>
      <p className="max-w-md text-neutral-500">Cette page n&apos;existe pas, ou la ressource ne vous appartient pas.</p>
      <ButtonLink href="/dashboard">Retour au tableau de bord</ButtonLink>
    </main>
  );
}
