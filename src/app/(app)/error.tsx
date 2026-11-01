"use client";

import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Card className="mx-auto max-w-lg space-y-3 text-center">
      <h1 className="text-xl font-bold">Une erreur est survenue</h1>
      <p className="text-sm text-neutral-500">Vos données sont conservées. Réessayez ; si le problème persiste, revenez au tableau de bord.</p>
      {error.digest && <p className="font-mono text-xs text-neutral-400">Référence : {error.digest}</p>}
      <div className="flex justify-center gap-2">
        <Button onClick={reset}>Réessayer</Button>
        <ButtonLink href="/dashboard" variant="outline">Tableau de bord</ButtonLink>
      </div>
    </Card>
  );
}
