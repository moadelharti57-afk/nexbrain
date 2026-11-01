import type { DeciderOutput } from "@/lib/agents/schemas";
import { CRITERIA_LABEL, EVIDENCE_KIND, IDEA_STATUS } from "@/lib/labels";

/**
 * Forme d'un instantané figé (BrainstormVersion.snapshot) : le brainstorm avec
 * problèmes → idées → analyses, sérialisé en JSON au moment de la fin d'analyse.
 */
type Evidence = { kind: keyof typeof EVIDENCE_KIND; statement: string; sourceUrl?: string | null; sourceTitle?: string | null; sourceDate?: string | null; validation?: string | null };
export type SnapshotIdea = {
  id: string;
  name: string;
  pitch: string;
  aiValue?: string | null;
  businessModel?: string | null;
  mvpFeatures?: string[] | null;
  status: keyof typeof IDEA_STATUS;
  score?: { total: number; rank: number | null; blocked: boolean; blockReasons: string[]; rationale?: string | null; feasibility: number; cost: number; delay: number; demand: number; commercial: number; weights: Record<string, number> } | null;
  techEstimate?: { costMinMad: number; costCentralMad: number; costMaxMad: number; durationMinDays: number; durationMaxDays: number; feasibility: number; blockers: string[]; architecture?: string | null } | null;
  marketAnalysis?: { verified: boolean; adoptionRisks: string[]; fieldQuestions: string[]; competitors: { name: string; kind: string; url?: string }[] } | null;
  tasks?: { title: string; hoursMin: number; hoursMax: number }[];
  evidence?: Evidence[];
};
export type Snapshot = {
  id: string;
  title: string;
  city?: string | null;
  country?: string | null;
  sector?: string | null;
  budgetMaxMad?: number | null;
  deadlineDays?: number | null;
  teamSize?: number | null;
  skills?: string[];
  targetAudience?: string | null;
  weights?: Record<string, number> | null;
  extra?: { decision?: DeciderOutput } | null;
  problems: { id: string; title: string; description: string; selected: boolean; frequency?: number | null; evidence?: Evidence[]; ideas: SnapshotIdea[] }[];
};

export function rankedIdeas(s: Snapshot): SnapshotIdea[] {
  return s.problems
    .flatMap((p) => p.ideas)
    .sort((a, b) => (a.score?.rank ?? 999) - (b.score?.rank ?? 999) || (b.score?.total ?? -1) - (a.score?.total ?? -1));
}

const r = (a: number, b: number, u: string) => (a === b ? `${a} ${u}` : `${a}–${b} ${u}`);

/** Rapport Markdown d'une version figée. */
export function toMarkdown(s: Snapshot, version: number, createdAt: Date): string {
  const L: string[] = [];
  const ideas = rankedIdeas(s);
  const decision = s.extra?.decision;
  L.push(`# NexBrain — ${s.title}`, "");
  L.push(`Version ${version} · ${createdAt.toLocaleDateString("fr-FR")}`, "");
  L.push("## Contexte", "");
  const ctx: [string, string | undefined | null][] = [
    ["Zone", [s.city, s.country].filter(Boolean).join(", ")],
    ["Secteur", s.sector],
    ["Budget maximal", s.budgetMaxMad != null ? `${s.budgetMaxMad} DH` : null],
    ["Délai", s.deadlineDays != null ? `${s.deadlineDays} jours` : null],
    ["Équipe", s.teamSize ? `${s.teamSize} personne(s)` : null],
    ["Compétences", s.skills?.join(", ")],
    ["Public cible", s.targetAudience],
  ];
  for (const [k, v] of ctx) if (v) L.push(`- **${k}** : ${v}`);
  L.push("");

  if (decision) {
    L.push("## Décision", "", decision.summary, "");
    if (decision.insufficientEvidence) L.push("> Aucune idée n'est suffisamment documentée : valider le besoin sur le terrain avant d'investir.", "");
  }

  L.push("## Classement", "", "| Rang | Idée | Score | Coût | Délai | Statut |", "|---|---|---|---|---|---|");
  for (const i of ideas) {
    const t = i.techEstimate;
    L.push(`| ${i.score?.rank ?? "—"} | ${i.name} | ${i.score ? `${i.score.total}/100` : "—"} | ${t ? r(t.costMinMad, t.costMaxMad, "DH") : "—"} | ${t ? r(t.durationMinDays, t.durationMaxDays, "j") : "—"} | ${IDEA_STATUS[i.status].label} |`);
  }
  L.push("", "_Un score n'est pas une probabilité de réussite. Le classement dépend des pondérations choisies._", "");

  for (const i of ideas.filter((x) => x.score && !x.score.blocked).slice(0, 3)) {
    L.push(`## ${i.score?.rank ? `#${i.score.rank} ` : ""}${i.name}`, "", i.pitch, "");
    if (i.aiValue) L.push(`- **Valeur de l'IA** : ${i.aiValue}`);
    if (i.businessModel) L.push(`- **Modèle économique** : ${i.businessModel}`);
    if (i.mvpFeatures?.length) L.push(`- **MVP** : ${i.mvpFeatures.join(" · ")}`);
    if (i.score) {
      L.push("", "**Détail du score**", "");
      for (const k of Object.keys(CRITERIA_LABEL) as (keyof typeof CRITERIA_LABEL)[]) L.push(`- ${CRITERIA_LABEL[k]} : ${i.score[k]}/100 (poids ${i.score.weights?.[k] ?? "—"})`);
      if (i.score.rationale) L.push("", "**Argumentaire**", "", i.score.rationale);
    }
    if (i.marketAnalysis) {
      L.push("", `**Marché**${i.marketAnalysis.verified ? "" : " (analyse non vérifiée)"}`, "");
      for (const q of i.marketAnalysis.fieldQuestions) L.push(`- À valider : ${q}`);
      for (const q of i.marketAnalysis.adoptionRisks) L.push(`- Risque : ${q}`);
    }
    if (i.evidence?.length) {
      L.push("", "**Preuves et hypothèses**", "");
      for (const e of i.evidence) L.push(`- [${EVIDENCE_KIND[e.kind].label}] ${e.statement}${e.sourceUrl ? ` — ${e.sourceUrl}` : ""}`);
    }
    if (i.tasks?.length) {
      L.push("", "**Backlog**", "");
      for (const t of i.tasks) L.push(`- ${t.title} (${r(t.hoursMin, t.hoursMax, "h")})`);
    }
    L.push("");
  }

  L.push("## Problèmes identifiés", "");
  for (const p of s.problems) L.push(`- ${p.selected ? "**" : ""}${p.title}${p.selected ? "**" : ""} — ${p.description}`);
  L.push("", "---", "Rapport généré par NexBrain. Les estimations sont des fourchettes fondées sur des hypothèses explicites.");
  return L.join("\n");
}
