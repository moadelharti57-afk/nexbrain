"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardHint } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { CRITERIA_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { brainstormInputSchema, DEFAULT_WEIGHTS, type Weights } from "@/lib/validation";

const DRAFT_KEY = "nexbrain:wizard-draft";
const STEPS = ["Contexte", "Ressources", "Objectifs", "Résumé"] as const;

type Form = {
  title: string;
  mode: "QUICK" | "ADVANCED";
  city: string;
  country: string;
  sector: string;
  subSector: string;
  knownProblem: string;
  description: string;
  budgetMaxMad: string;
  deadlineDays: string;
  teamSize: string;
  availability: string;
  skills: string;
  targetAudience: string;
  marketType: "" | "B2B" | "B2C" | "B2G";
  zone: "" | "LOCAL" | "REGIONAL" | "NATIONAL";
  projectTypes: string[];
  monetization: string;
  impact: string;
  offline: boolean;
  availableData: string;
  hardware: string;
  apis: string;
  regulation: string;
  weights: Weights;
};

const EMPTY: Form = {
  title: "",
  mode: "QUICK",
  city: "",
  country: "Maroc",
  sector: "",
  subSector: "",
  knownProblem: "",
  description: "",
  budgetMaxMad: "",
  deadlineDays: "",
  teamSize: "",
  availability: "",
  skills: "",
  targetAudience: "",
  marketType: "",
  zone: "",
  projectTypes: [],
  monetization: "",
  impact: "",
  offline: false,
  availableData: "",
  hardware: "",
  apis: "",
  regulation: "",
  weights: DEFAULT_WEIGHTS,
};

/** Champs vérifiés à chaque étape avant de continuer. */
const STEP_FIELDS: (keyof z.infer<typeof brainstormInputSchema>)[][] = [
  ["title", "city", "country", "sector", "subSector", "knownProblem", "description"],
  ["budgetMaxMad", "deadlineDays", "teamSize", "availability", "skills"],
  ["targetAudience", "marketType", "zone", "extra", "weights"],
  [],
];

const opt = (s: string) => (s.trim() ? s.trim() : undefined);
const num = (s: string) => (s.trim() === "" ? undefined : Number(s));

function toPayload(f: Form) {
  const advanced = f.mode === "ADVANCED";
  return {
    title: f.title.trim() || [f.city, f.sector].filter(Boolean).join(" · ") || "Nouveau brainstorming",
    mode: f.mode,
    city: opt(f.city),
    country: opt(f.country),
    sector: opt(f.sector),
    subSector: advanced ? opt(f.subSector) : undefined,
    knownProblem: opt(f.knownProblem),
    description: opt(f.description),
    budgetMaxMad: num(f.budgetMaxMad),
    deadlineDays: num(f.deadlineDays),
    teamSize: num(f.teamSize),
    availability: advanced ? opt(f.availability) : undefined,
    skills: f.skills.split(",").map((s) => s.trim()).filter(Boolean),
    targetAudience: opt(f.targetAudience),
    marketType: f.marketType || undefined,
    zone: f.zone || undefined,
    extra: advanced
      ? {
          projectTypes: f.projectTypes.length ? (f.projectTypes as ("WEB" | "MOBILE" | "AI" | "IOT" | "SAAS")[]) : undefined,
          monetization: opt(f.monetization),
          impact: opt(f.impact),
          offline: f.offline || undefined,
          availableData: opt(f.availableData),
          hardware: opt(f.hardware),
          apis: opt(f.apis),
          regulation: opt(f.regulation),
        }
      : undefined,
    weights: f.weights,
  };
}

export function BrainstormWizard({ defaultWeights = DEFAULT_WEIGHTS }: { defaultWeights?: Weights }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>({ ...EMPTY, weights: defaultWeights });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Brouillon local (confort par navigateur : jamais indispensable)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setForm({ ...EMPTY, weights: defaultWeights, ...JSON.parse(raw) });
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    } catch {}
  }, [form]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const payload = useMemo(() => toPayload(form), [form]);
  const advanced = form.mode === "ADVANCED";

  function validate(fields: string[]) {
    const res = brainstormInputSchema.safeParse(payload);
    if (res.success) {
      setErrors({});
      return true;
    }
    const errs: Record<string, string> = {};
    for (const issue of res.error.issues) {
      const key = String(issue.path[0]);
      if (fields.length === 0 || fields.includes(key)) errs[key] ??= issue.message;
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function next() {
    if (validate(STEP_FIELDS[step])) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  async function submit(run: boolean) {
    if (!validate([])) return;
    setPending(true);
    setServerError(null);
    try {
      const res = await fetch("/api/brainstorms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erreur");
      if (run) {
        const r = await fetch(`/api/brainstorms/${json.brainstorm.id}/run`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });
        if (!r.ok) throw new Error((await r.json()).error ?? "Lancement impossible");
      }
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {}
      router.push(`/brainstorms/${json.brainstorm.id}`);
    } catch (e) {
      setServerError((e as Error).message);
      setPending(false);
    }
  }

  const totalW = Object.values(form.weights).reduce((a, b) => a + b, 0);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="space-y-6">
        {/* Étapes */}
        <ol className="grid grid-cols-4 gap-2 text-xs sm:text-sm">
          {STEPS.map((s, i) => (
            <li key={s}>
              <button
                type="button"
                onClick={() => (i < step ? setStep(i) : i === step + 1 && next())}
                className={cn(
                  "w-full border-t-2 pt-2 text-left",
                  i <= step ? "border-violet-600 text-violet-700 dark:text-violet-300" : "border-neutral-200 text-neutral-400 dark:border-neutral-800",
                )}
              >
                <span className="font-mono">0{i + 1}</span> {s}
              </button>
            </li>
          ))}
        </ol>

        {step === 0 && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Quel problème souhaitez-vous explorer ?</h2>
              <div className="flex rounded-lg border border-neutral-300 p-0.5 text-sm dark:border-neutral-700">
                {(["QUICK", "ADVANCED"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => set("mode", m)}
                    className={cn("rounded-md px-3 py-1", form.mode === m && "bg-violet-600 text-white")}
                  >
                    {m === "QUICK" ? "Découverte rapide" : "Analyse avancée"}
                  </button>
                ))}
              </div>
            </div>
            <Field label="Titre" hint="Facultatif — généré à partir de la ville et du secteur" error={errors.title}>
              <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Services locaux à Béni Mellal" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Ville" error={errors.city}>
                <Input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Béni Mellal" />
              </Field>
              <Field label="Pays" error={errors.country}>
                <Input value={form.country} onChange={(e) => set("country", e.target.value)} />
              </Field>
              <Field label="Secteur" hint="Vide = tous les secteurs" error={errors.sector}>
                <Input value={form.sector} onChange={(e) => set("sector", e.target.value)} placeholder="Commerce, santé, éducation…" />
              </Field>
              {advanced && (
                <Field label="Sous-secteur" error={errors.subSector}>
                  <Input value={form.subSector} onChange={(e) => set("subSector", e.target.value)} />
                </Field>
              )}
            </div>
            <Field label="Problème connu" hint="Facultatif" error={errors.knownProblem}>
              <Input value={form.knownProblem} onChange={(e) => set("knownProblem", e.target.value)} />
            </Field>
            <Field label="Description" error={errors.description}>
              <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Identifier un besoin concret avec l'IA" />
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Vos ressources</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Budget maximal (DH)" error={errors.budgetMaxMad}>
                <Input type="number" min={0} value={form.budgetMaxMad} onChange={(e) => set("budgetMaxMad", e.target.value)} placeholder="1000" />
              </Field>
              <Field label="Délai (jours)" error={errors.deadlineDays}>
                <Input type="number" min={1} value={form.deadlineDays} onChange={(e) => set("deadlineDays", e.target.value)} placeholder="7" />
              </Field>
              <Field label="Taille de l'équipe" error={errors.teamSize}>
                <Input type="number" min={1} value={form.teamSize} onChange={(e) => set("teamSize", e.target.value)} placeholder="4" />
              </Field>
            </div>
            <Field label="Compétences" hint="Séparées par des virgules" error={errors.skills}>
              <Input value={form.skills} onChange={(e) => set("skills", e.target.value)} placeholder="Next.js, APIs IA, design" />
            </Field>
            {advanced && (
              <Field label="Disponibilité" error={errors.availability}>
                <Input value={form.availability} onChange={(e) => set("availability", e.target.value)} placeholder="Soirs et week-ends" />
              </Field>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Marché et objectifs</h2>
            <Field label="Public cible" error={errors.targetAudience}>
              <Input value={form.targetAudience} onChange={(e) => set("targetAudience", e.target.value)} placeholder="Habitants et petites entreprises" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Type de marché">
                <Select value={form.marketType} onChange={(e) => set("marketType", e.target.value as Form["marketType"])}>
                  <option value="">Indifférent</option>
                  <option value="B2C">B2C — particuliers</option>
                  <option value="B2B">B2B — entreprises</option>
                  <option value="B2G">B2G — administrations</option>
                </Select>
              </Field>
              <Field label="Zone">
                <Select value={form.zone} onChange={(e) => set("zone", e.target.value as Form["zone"])}>
                  <option value="">Indifférente</option>
                  <option value="LOCAL">Locale</option>
                  <option value="REGIONAL">Régionale</option>
                  <option value="NATIONAL">Nationale</option>
                </Select>
              </Field>
            </div>

            {advanced && (
              <>
                <div className="space-y-1.5">
                  <span className="text-sm font-medium">Type de projet</span>
                  <div className="flex flex-wrap gap-2">
                    {(["WEB", "MOBILE", "AI", "IOT", "SAAS"] as const).map((t) => {
                      const on = form.projectTypes.includes(t);
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => set("projectTypes", on ? form.projectTypes.filter((x) => x !== t) : [...form.projectTypes, t])}
                          className={cn("rounded-full border px-3 py-1 text-sm", on ? "border-violet-600 bg-violet-600 text-white" : "border-neutral-300 dark:border-neutral-700")}
                        >
                          {t === "AI" ? "IA" : t === "IOT" ? "IoT" : t === "SAAS" ? "SaaS" : t === "WEB" ? "Web" : "Mobile"}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Monétisation"><Input value={form.monetization} onChange={(e) => set("monetization", e.target.value)} /></Field>
                  <Field label="Impact recherché"><Input value={form.impact} onChange={(e) => set("impact", e.target.value)} /></Field>
                  <Field label="Données disponibles"><Input value={form.availableData} onChange={(e) => set("availableData", e.target.value)} /></Field>
                  <Field label="Matériel"><Input value={form.hardware} onChange={(e) => set("hardware", e.target.value)} /></Field>
                  <Field label="APIs disponibles"><Input value={form.apis} onChange={(e) => set("apis", e.target.value)} /></Field>
                  <Field label="Réglementation"><Input value={form.regulation} onChange={(e) => set("regulation", e.target.value)} /></Field>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.offline} onChange={(e) => set("offline", e.target.checked)} className="accent-violet-600" />
                  Doit fonctionner hors ligne
                </label>
              </>
            )}

            <div className="space-y-3 rounded-lg bg-neutral-50 p-4 dark:bg-neutral-900">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Priorités (pondérations du score)</span>
                <button type="button" className="text-xs text-violet-600" onClick={() => set("weights", defaultWeights)}>Réinitialiser</button>
              </div>
              {(Object.keys(CRITERIA_LABEL) as (keyof Weights)[]).map((k) => (
                <label key={k} className="grid grid-cols-[140px_1fr_48px] items-center gap-3 text-sm">
                  <span>{CRITERIA_LABEL[k]}</span>
                  <input
                    type="range"
                    min={0}
                    max={50}
                    value={form.weights[k]}
                    onChange={(e) => set("weights", { ...form.weights, [k]: Number(e.target.value) })}
                    className="accent-violet-600"
                  />
                  <span className="text-right tabular-nums">{totalW ? Math.round((form.weights[k] / totalW) * 100) : 0} %</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Résumé</h2>
            <p className="text-sm text-neutral-500">
              Les 5 agents vont : repérer {advanced ? "jusqu'à 20" : "environ 10"} problèmes, imaginer 2 à 3 solutions pour les plus fréquents,
              étudier le marché et estimer coûts et délais, puis classer les idées. Les estimations sont des fourchettes, pas des certitudes.
            </p>
            <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              {[
                ["Titre", payload.title],
                ["Zone", [payload.city, payload.country].filter(Boolean).join(", ") || "—"],
                ["Secteur", payload.sector ?? "Tous les secteurs"],
                ["Budget", payload.budgetMaxMad != null ? `${payload.budgetMaxMad} DH` : "—"],
                ["Délai", payload.deadlineDays != null ? `${payload.deadlineDays} jours` : "—"],
                ["Équipe", payload.teamSize ? `${payload.teamSize} personne(s)` : "—"],
                ["Compétences", payload.skills.join(", ") || "—"],
                ["Public cible", payload.targetAudience ?? "—"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-neutral-100 py-1 dark:border-neutral-900">
                  <dt className="text-neutral-500">{k}</dt>
                  <dd className="text-right font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            {Object.keys(errors).length > 0 && <p className="text-sm text-red-600">Certains champs sont invalides : revenez aux étapes précédentes.</p>}
            {serverError && <p className="text-sm text-red-600">{serverError}</p>}
          </div>
        )}

        <div className="flex justify-between gap-2 border-t border-neutral-100 pt-4 dark:border-neutral-900">
          <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || pending}>
            ← Retour
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={next}>Continuer →</Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => submit(false)} disabled={pending}>Enregistrer le brouillon</Button>
              <Button onClick={() => submit(true)} disabled={pending}>{pending ? "Lancement…" : "Lancer les agents"}</Button>
            </div>
          )}
        </div>
      </Card>

      {/* Prévisualisation */}
      <Card className="h-fit space-y-3 lg:sticky lg:top-8">
        <p className="text-xs font-semibold tracking-widest text-neutral-500">PRÉVISUALISATION</p>
        {[
          ["Zone", [payload.city, payload.country].filter(Boolean).join(", ") || "Non précisée"],
          ["Secteur", payload.sector ?? "Tous les secteurs"],
          ["Budget", payload.budgetMaxMad != null ? `${payload.budgetMaxMad.toLocaleString("fr-FR")} DH` : "—"],
          ["Délai", payload.deadlineDays != null ? `${payload.deadlineDays} jours` : "—"],
          ["Public cible", payload.targetAudience ?? "—"],
          ["Description", payload.description ?? "—"],
        ].map(([k, v]) => (
          <div key={k}>
            <p className="text-xs text-neutral-500 uppercase">{k}</p>
            <p className="text-sm font-medium break-words">{v}</p>
          </div>
        ))}
        <CardHint className="text-xs">Brouillon enregistré automatiquement dans ce navigateur.</CardHint>
      </Card>
    </div>
  );
}
