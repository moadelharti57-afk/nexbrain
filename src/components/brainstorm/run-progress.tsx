"use client";

import { Check, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AGENT_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";

type Agent = keyof typeof AGENT_LABEL;
type Exec = { agent: Agent; status: string };
type RunState = { run: { id: string; status: string; currentAgent: Agent | null; error: string | null; executions: Exec[] }; progress: number };

const ORDER: Agent[] = ["EXPLORER", "INNOVATOR", "ANALYST", "TECHNICAL", "DECIDER"];

/** Suit l'exécution des agents (polling) et rafraîchit la page à la fin. */
export function RunProgress({ runId, initialStatus }: { runId: string; initialStatus: string }) {
  const router = useRouter();
  const [state, setState] = useState<RunState | null>(null);
  const active = (s?: string) => s === "QUEUED" || s === "RUNNING";
  const status = state?.run.status ?? initialStatus;

  useEffect(() => {
    if (!active(initialStatus)) return;
    let stop = false;
    async function tick() {
      try {
        const res = await fetch(`/api/runs/${runId}`, { cache: "no-store" });
        if (res.ok) {
          const json: RunState = await res.json();
          if (stop) return;
          setState(json);
          if (!active(json.run.status)) {
            router.refresh();
            return;
          }
        }
      } catch {}
      if (!stop) setTimeout(tick, 2000);
    }
    tick();
    return () => {
      stop = true;
    };
  }, [runId, initialStatus, router]);

  if (!active(initialStatus) && !state) return null;

  const agentState = (a: Agent) => {
    const execs = state?.run.executions.filter((e) => e.agent === a) ?? [];
    if (execs.some((e) => e.status === "RUNNING") || state?.run.currentAgent === a) return "running";
    if (execs.length && execs.every((e) => e.status === "SUCCEEDED")) return "done";
    if (execs.some((e) => e.status === "FAILED") && !active(status)) return "failed";
    if (execs.some((e) => e.status === "SUCCEEDED")) return "running";
    return "pending";
  };

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold">
          {active(status) ? "Les agents travaillent…" : status === "SUCCEEDED" ? "Analyse terminée" : "Analyse interrompue"}
        </p>
        {active(status) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await fetch(`/api/runs/${runId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: '{"action":"cancel"}' });
              router.refresh();
            }}
          >
            Annuler
          </Button>
        )}
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
        <div className="h-full bg-violet-600 transition-all" style={{ width: `${state?.progress ?? 0}%` }} />
      </div>
      <ol className="grid gap-2 sm:grid-cols-5">
        {ORDER.map((a, i) => {
          const s = agentState(a);
          return (
            <li key={a} className={cn("flex items-center gap-2 text-sm", s === "pending" && "text-neutral-400")}>
              {s === "done" ? <Check className="size-4 text-emerald-600" /> : s === "running" ? <Loader2 className="size-4 animate-spin text-violet-600" /> : s === "failed" ? <X className="size-4 text-red-600" /> : <span className="font-mono text-xs">0{i + 1}</span>}
              {AGENT_LABEL[a]}
            </li>
          );
        })}
      </ol>
      {state?.run.error && active(status) && <p className="text-xs text-amber-600">Nouvelle tentative automatique : {state.run.error}</p>}
    </Card>
  );
}
