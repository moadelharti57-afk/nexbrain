"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CriteriaRadar } from "@/components/charts/criteria-radar";
import { ScoreBars } from "@/components/charts/score-bars";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHint, CardTitle } from "@/components/ui/card";
import { CRITERIA_LABEL, CRITERIA_SHORT, range } from "@/lib/labels";
import { rank, weightedScore, type CriteriaScores } from "@/lib/scoring";
import { cn } from "@/lib/utils";
import { DEFAULT_WEIGHTS, type Weights } from "@/lib/validation";

export type CompareIdea = {
  id: string;
  name: string;
  brainstorm: string;
  criteria: CriteriaScores;
  blocked: boolean;
  verified: boolean;
  cost: [number, number];
  duration: [number, number];
};

const MAX = 5;

export function Comparator({ ideas, initial }: { ideas: CompareIdea[]; initial: string[] }) {
  const [selected, setSelected] = useState<string[]>(initial.slice(0, MAX));
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);
  const [saved, setSaved] = useState<string | null>(null);

  const rows = useMemo(() => {
    const chosen = ideas.filter((i) => selected.includes(i.id));
    return rank(chosen.map((i) => ({ ...i, total: weightedScore(i.criteria, weights) }))).sort(
      (a, b) => (a.rank ?? 99) - (b.rank ?? 99),
    );
  }, [ideas, selected, weights]);

  const totalW = Object.values(weights).reduce((a, b) => a + b, 0);
  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length < MAX ? [...s, id] : s));

  if (ideas.length === 0) {
    return <Card><CardHint>Aucune idée analysée pour l&apos;instant. Lancez un brainstorming pour pouvoir comparer.</CardHint></Card>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
      <div className="min-w-0 space-y-4">
        <Card className="space-y-2">
          <CardTitle>Idées ({selected.length}/{MAX})</CardTitle>
          <ul className="max-h-80 space-y-1 overflow-y-auto">
            {ideas.map((i) => (
              <li key={i.id}>
                <label className={cn("flex cursor-pointer items-start gap-2 rounded-md p-1.5 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-900", !selected.includes(i.id) && selected.length >= MAX && "opacity-50")}>
                  <input type="checkbox" checked={selected.includes(i.id)} onChange={() => toggle(i.id)} className="mt-0.5 accent-violet-600" />
                  <span><span className="font-medium">{i.name}</span><span className="block text-xs text-neutral-500">{i.brainstorm}</span></span>
                </label>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <CardTitle>Pondérations</CardTitle>
            <button className="text-xs text-violet-600" onClick={() => setWeights(DEFAULT_WEIGHTS)}>Réinitialiser</button>
          </div>
          {(Object.keys(CRITERIA_LABEL) as (keyof Weights)[]).map((k) => (
            <label key={k} className="block space-y-1 text-sm">
              <span className="flex justify-between"><span>{CRITERIA_LABEL[k]}</span><span className="tabular-nums text-neutral-500">{totalW ? Math.round((weights[k] / totalW) * 100) : 0} %</span></span>
              <input type="range" min={0} max={50} value={weights[k]} onChange={(e) => setWeights({ ...weights, [k]: Number(e.target.value) })} className="w-full accent-violet-600" />
            </label>
          ))}
        </Card>
      </div>

      <div className="min-w-0 space-y-4">
        {rows.length < 2 ? (
          <Card><CardHint>Sélectionnez au moins 2 idées.</CardHint></Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              {rows.slice(0, 3).map((r) => (
                <Link key={r.id} href={`/ideas/${r.id}`}>
                  <Card className="h-full space-y-2 hover:border-violet-400">
                    <div className="flex justify-between">
                      <span className="text-sm text-violet-600">{r.rank ? `#${r.rank}` : "Écartée"}</span>
                      {!r.verified && <Badge tone="warning">À vérifier</Badge>}
                    </div>
                    <p className="font-semibold">{r.name}</p>
                    <p className="text-3xl font-bold tabular-nums">{r.total}<span className="text-base font-normal text-neutral-400">/100</span></p>
                    <p className="text-sm text-neutral-500">{range(r.cost[0], r.cost[1], "DH")} · {range(r.duration[0], r.duration[1], "j")}</p>
                  </Card>
                </Link>
              ))}
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              <Card><CardTitle>Notes par critère</CardTitle><ScoreBars series={rows.map((r) => ({ name: r.name, criteria: r.criteria }))} /></Card>
              <Card><CardTitle>Profils</CardTitle><CriteriaRadar series={rows.map((r) => ({ name: r.name, criteria: r.criteria }))} /></Card>
            </div>
            <Card className="overflow-x-auto">
              <table className="w-full text-sm whitespace-nowrap">
                <thead className="text-left text-neutral-500">
                  <tr><th className="py-1">Rang</th><th>Idée</th>{Object.values(CRITERIA_SHORT).map((l) => <th key={l} className="px-2 text-right">{l}</th>)}<th className="text-right">Score</th></tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-900">
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td className="py-1.5">{r.rank ?? "—"}</td>
                      <td className="font-medium">{r.name}{r.blocked && <span className="ml-1 text-xs text-red-600">(hors contraintes)</span>}</td>
                      {(Object.keys(CRITERIA_LABEL) as (keyof CriteriaScores)[]).map((k) => <td key={k} className="text-right tabular-nums">{r.criteria[k]}</td>)}
                      <td className="text-right font-semibold tabular-nums">{r.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={async () => {
                  const res = await fetch("/api/comparisons", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ideaIds: selected, weights }) });
                  setSaved(res.ok ? "Comparaison enregistrée." : "Échec de l'enregistrement.");
                }}
              >
                Enregistrer la comparaison
              </Button>
              {saved && <span className="text-sm text-neutral-500">{saved}</span>}
            </div>
            <p className="text-xs text-neutral-500">Le classement dépend des critères : il change si vous modifiez les poids. Les idées hors budget ou hors délai ne sont pas classées.</p>
          </>
        )}
      </div>
    </div>
  );
}
