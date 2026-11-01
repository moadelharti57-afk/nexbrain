"use client";

import { useRouter } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui/button";

/** Actions par ligne d'historique selon le statut (diapositive 22). */
export function HistoryActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const call = async (url: string, method: string, body?: unknown) => {
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    return res.ok ? res : null;
  };
  return (
    <div className="flex flex-wrap justify-end gap-1">
      {status === "ARCHIVED" ? (
        <Button size="sm" variant="outline" onClick={async () => { await call(`/api/brainstorms/${id}`, "PATCH", { status: "DRAFT" }); router.refresh(); }}>Restaurer</Button>
      ) : (
        <ButtonLink size="sm" variant="outline" href={`/brainstorms/${id}`}>{status === "RUNNING" || status === "FAILED" || status === "DRAFT" ? "Reprendre" : "Ouvrir"}</ButtonLink>
      )}
      {status === "COMPLETED" && <ButtonLink size="sm" variant="ghost" href={`/compare`}>Comparer</ButtonLink>}
      <Button
        size="sm"
        variant="ghost"
        onClick={async () => {
          const res = await call(`/api/brainstorms/${id}/duplicate`, "POST", {});
          if (res) router.push(`/brainstorms/${(await res.json()).brainstorm.id}`);
        }}
      >
        Dupliquer
      </Button>
      {status !== "RUNNING" && (
        <Button
          size="sm"
          variant="ghost"
          className="text-red-600"
          onClick={async () => {
            if (!confirm("Supprimer définitivement ce brainstorming et ses résultats ?")) return;
            await call(`/api/brainstorms/${id}`, "DELETE");
            router.refresh();
          }}
        >
          Supprimer
        </Button>
      )}
    </div>
  );
}
