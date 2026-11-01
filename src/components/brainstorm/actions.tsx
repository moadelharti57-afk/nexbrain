"use client";

import { Download, RotateCcw, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { AGENT_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";

async function post(url: string, body: unknown = {}, method = "POST") {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Erreur");
  return res;
}

/** Barre d'actions d'un brainstorm : lancer / relancer un agent, exporter, dupliquer, archiver. */
export function BrainstormActions({ id, status, lastRunId, lastRunFailed, hasVersions }: { id: string; status: string; lastRunId?: string; lastRunFailed: boolean; hasVersions: boolean }) {
  const router = useRouter();
  const [from, setFrom] = useState("EXPLORER");
  const [format, setFormat] = useState<"PDF" | "MARKDOWN" | "JSON">("PDF");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const busy = status === "RUNNING";

  const act = (fn: () => Promise<void>) => async () => {
    setPending(true);
    setError(null);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {status === "DRAFT" ? (
          <Button disabled={pending} onClick={act(async () => void (await post(`/api/brainstorms/${id}/run`)))}>Lancer les agents</Button>
        ) : (
          <>
            {lastRunFailed && lastRunId && (
              <Button disabled={pending} onClick={act(async () => void (await post(`/api/runs/${lastRunId}`, { action: "retry" })))}>
                <RotateCcw className="size-4" /> Reprendre
              </Button>
            )}
            <div className="flex items-center gap-1">
              <Select value={from} onChange={(e) => setFrom(e.target.value)} className="h-10 w-auto" disabled={busy} aria-label="Relancer à partir de">
                {Object.entries(AGENT_LABEL).map(([k, v]) => <option key={k} value={k}>Depuis : {v}</option>)}
              </Select>
              <Button variant="outline" disabled={busy || pending} onClick={act(async () => void (await post(`/api/brainstorms/${id}/run`, { startFrom: from })))}>Relancer</Button>
            </div>
          </>
        )}
        {hasVersions && (
          <div className="flex items-center gap-1">
            <Select value={format} onChange={(e) => setFormat(e.target.value as typeof format)} className="h-10 w-auto" aria-label="Format d'export">
              <option value="PDF">PDF</option>
              <option value="MARKDOWN">Markdown</option>
              <option value="JSON">JSON</option>
            </Select>
            <Button
              variant="outline"
              disabled={pending}
              onClick={act(async () => {
                const res = await post("/api/reports", { brainstormId: id, format });
                if (format === "PDF") {
                  window.open((await res.json()).url, "_blank", "noopener");
                  return;
                }
                const url = URL.createObjectURL(await res.blob());
                const a = Object.assign(document.createElement("a"), { href: url, download: `nexbrain-${id}.${format === "JSON" ? "json" : "md"}` });
                a.click();
                URL.revokeObjectURL(url);
              })}
            >
              <Download className="size-4" /> Exporter
            </Button>
          </div>
        )}
        <Button
          variant="ghost"
          disabled={pending}
          onClick={act(async () => {
            const res = await post(`/api/brainstorms/${id}/duplicate`);
            const { brainstorm } = await res.json();
            router.push(`/brainstorms/${brainstorm.id}`);
          })}
        >
          Dupliquer
        </Button>
        {status !== "ARCHIVED" && !busy && (
          <Button variant="ghost" disabled={pending} onClick={act(async () => void (await post(`/api/brainstorms/${id}`, { status: "ARCHIVED" }, "PATCH")))}>Archiver</Button>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

export function FavoriteButton({ ideaId, favorite }: { ideaId: string; favorite: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(favorite);
  return (
    <button
      aria-label={on ? "Retirer des favoris" : "Ajouter aux favoris"}
      onClick={async (e) => {
        e.preventDefault();
        setOn(!on);
        await post(`/api/ideas/${ideaId}`, { favorite: !on }, "PATCH").catch(() => setOn(on));
        router.refresh();
      }}
      className="text-neutral-400 hover:text-amber-500"
    >
      <Star className={cn("size-5", on && "fill-amber-400 text-amber-500")} />
    </button>
  );
}

export function ProblemToggle({ problemId, selected, disabled }: { problemId: string; selected: boolean; disabled?: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(selected);
  return (
    <input
      type="checkbox"
      checked={on}
      disabled={disabled}
      aria-label="Approfondir ce problème"
      className="mt-1 accent-violet-600"
      onChange={async () => {
        setOn(!on);
        await post(`/api/problems/${problemId}`, { selected: !on }, "PATCH").catch(() => setOn(on));
        router.refresh();
      }}
    />
  );
}
