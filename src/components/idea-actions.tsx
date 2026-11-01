"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";

export function IdeaActions({ ideaId, brainstormId, chosen }: { ideaId: string; brainstormId: string; chosen: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <>
      {!chosen && (
        <Button
          disabled={pending}
          onClick={async () => {
            setPending(true);
            await fetch(`/api/ideas/${ideaId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: '{"status":"CHOSEN"}' });
            setPending(false);
            router.refresh();
          }}
        >
          Choisir et planifier
        </Button>
      )}
      <ButtonLink href={`/compare?ids=${ideaId}`} variant="outline">Comparer</ButtonLink>
      <ButtonLink href={`/brainstorms/${brainstormId}`} variant="ghost">Relancer / exporter</ButtonLink>
    </>
  );
}
