"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHint, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { CRITERIA_LABEL } from "@/lib/labels";
import { DEFAULT_WEIGHTS, type Weights } from "@/lib/validation";

export function SettingsForm({ name, email, weights: initial }: { name: string | null; email: string; weights: Weights }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(name ?? "");
  const [weights, setWeights] = useState(initial);
  const [msg, setMsg] = useState<string | null>(null);
  const totalW = Object.values(weights).reduce((a, b) => a + b, 0);

  async function save() {
    setMsg(null);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: displayName, weights }),
    });
    setMsg(res.ok ? "Préférences enregistrées." : "Échec de l'enregistrement.");
    router.refresh();
  }

  return (
    <>
      <Card className="space-y-3">
        <CardTitle>Compte</CardTitle>
        <Field label="Nom affiché"><Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} /></Field>
        <CardHint>{email}</CardHint>
      </Card>
      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <CardTitle>Pondérations par défaut</CardTitle>
          <button className="text-xs text-violet-600" onClick={() => setWeights(DEFAULT_WEIGHTS)}>Valeurs du cahier des charges</button>
        </div>
        <CardHint>Utilisées pour chaque nouveau brainstorming (modifiables à l&apos;étape « Objectifs »).</CardHint>
        {(Object.keys(CRITERIA_LABEL) as (keyof Weights)[]).map((k) => (
          <label key={k} className="block space-y-1 text-sm">
            <span className="flex justify-between"><span>{CRITERIA_LABEL[k]}</span><span className="tabular-nums text-neutral-500">{totalW ? Math.round((weights[k] / totalW) * 100) : 0} %</span></span>
            <input type="range" min={0} max={50} value={weights[k]} onChange={(e) => setWeights({ ...weights, [k]: Number(e.target.value) })} className="w-full accent-violet-600" />
          </label>
        ))}
      </Card>
      <div className="flex items-center gap-3 lg:col-span-2">
        <Button onClick={save}>Enregistrer</Button>
        {msg && <span className="text-sm text-neutral-500">{msg}</span>}
      </div>
    </>
  );
}
