import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CostLinesChart, ScenarioChart } from "@/components/charts/cost-chart";
import { CriteriaRadar } from "@/components/charts/criteria-radar";
import { Gantt } from "@/components/charts/gantt";
import { IdeaActions } from "@/components/idea-actions";
import { Loading, PageHeader } from "@/components/page-header";
import { Tabs } from "@/components/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardHint, CardTitle } from "@/components/ui/card";
import { pageUser } from "@/lib/auth/page";
import { db } from "@/lib/db";
import { schedule, type CostLine } from "@/lib/estimate";
import { CRITERIA_LABEL, EVIDENCE_KIND, IDEA_STATUS, mad, range } from "@/lib/labels";
import { DEFAULT_WEIGHTS, weightsSchema } from "@/lib/validation";

type Competitor = { name: string; kind: "direct" | "alternative"; url?: string; price?: string };

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <CardHint>{label}</CardHint>
      {hint && <p className="mt-1 text-xs text-neutral-400">{hint}</p>}
    </Card>
  );
}

function List({ items, empty }: { items: string[]; empty: string }) {
  if (!items.length) return <CardHint>{empty}</CardHint>;
  return <ul className="list-disc space-y-1 pl-5 text-sm">{items.map((i) => <li key={i}>{i}</li>)}</ul>;
}

async function Content({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await pageUser(`/ideas/${id}`);
  const idea = await db.idea.findFirst({
    where: { id, problem: { brainstorm: { userId: user.id } } },
    include: {
      problem: { include: { brainstorm: true } },
      marketAnalysis: true,
      techEstimate: true,
      score: true,
      tasks: { orderBy: { order: "asc" } },
      evidence: true,
    },
  });
  if (!idea) notFound();

  const b = idea.problem.brainstorm;
  const t = idea.techEstimate;
  const m = idea.marketAnalysis;
  const s = idea.score;
  const st = IDEA_STATUS[idea.status];
  const weights = weightsSchema.safeParse(s?.weights).data ?? DEFAULT_WEIGHTS;
  const totalW = Object.values(weights).reduce((a, c) => a + c, 0);
  const criteria = s && { feasibility: s.feasibility, cost: s.cost, delay: s.delay, demand: s.demand, commercial: s.commercial };
  const costLines = ((t?.costLines as CostLine[] | undefined) ?? []).map((l) => ({ ...l, total: l.qty * l.unitPriceMad }));
  const planned = schedule(idea.tasks);
  const competitors = (m?.competitors as Competitor[] | undefined) ?? [];
  const mvp = (idea.mvpFeatures as string[] | null) ?? [];

  const notAnalyzed = <CardHint>Cette idée n&apos;a pas encore été analysée par les agents Analyste et Technique.</CardHint>;

  const overview = (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Score global" value={s ? `${s.total}/100` : "—"} hint={s?.rank ? `Rang ${s.rank}` : s?.blocked ? "Hors contraintes" : undefined} />
        <Stat label="Faisabilité" value={t ? `${t.feasibility} %` : "—"} />
        <Stat label="Budget" value={t ? range(t.costMinMad, t.costMaxMad, "DH") : "—"} hint={b.budgetMaxMad != null ? `Budget max ${mad(b.budgetMaxMad)}` : undefined} />
        <Stat label="Délai" value={t ? range(t.durationMinDays, t.durationMaxDays, "j") : "—"} hint={b.deadlineDays != null ? `Disponible ${b.deadlineDays} j` : undefined} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-2">
          <CardTitle>Pourquoi cette idée est-elle classée ainsi ?</CardTitle>
          <p className="text-sm whitespace-pre-line">{s?.rationale ?? "Justification disponible après le passage du Décideur."}</p>
          {s?.blocked && <p className="text-sm text-red-600">{s.blockReasons.join(" ; ")}</p>}
        </Card>
        <Card>
          <CardTitle>Profil multicritère</CardTitle>
          {criteria ? <CriteriaRadar series={[{ name: idea.name, criteria }]} /> : notAnalyzed}
        </Card>
      </div>
      <Card className="space-y-1">
        <CardTitle>Problème traité</CardTitle>
        <p className="text-sm">{idea.problem.title}</p>
        <CardHint>{idea.problem.description}</CardHint>
      </Card>
    </div>
  );

  const feasibility = t ? (
    <div className="grid gap-4 lg:grid-cols-3">
      <Stat label="Score de faisabilité" value={`${t.feasibility} %`} hint="Calculé à partir de la complexité, des blocages et des compétences manquantes" />
      <Card className="space-y-2"><CardTitle>Blocages</CardTitle><List items={t.blockers} empty="Aucun blocage identifié." /></Card>
      <Card className="space-y-2"><CardTitle>Sécurité</CardTitle><List items={t.securityNotes} empty="Aucun point signalé." /></Card>
      {t.architecture && <Card className="space-y-2 lg:col-span-3"><CardTitle>Architecture proposée</CardTitle><p className="text-sm">{t.architecture}</p></Card>}
    </div>
  ) : notAnalyzed;

  const cost = t ? (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="space-y-2">
        <CardTitle>Scénarios</CardTitle>
        <ScenarioChart min={t.costMinMad} central={t.costCentralMad} max={t.costMaxMad} budget={b.budgetMaxMad} />
      </Card>
      <Card className="space-y-2">
        <CardTitle>Postes de coût</CardTitle>
        {costLines.length ? <CostLinesChart lines={costLines} /> : <CardHint>Aucun poste détaillé.</CardHint>}
      </Card>
      <Card className="lg:col-span-2">
        <CardTitle className="mb-3">Base de calcul</CardTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-neutral-500">
              <tr><th className="py-1">Poste</th><th>Unité</th><th className="text-right">Qté</th><th className="text-right">Prix unitaire</th><th className="text-right">Total</th><th className="text-right">Date du prix</th></tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-900">
              {costLines.map((l) => (
                <tr key={l.label}><td className="py-1.5">{l.label}</td><td>{l.unit}</td><td className="text-right">{l.qty}</td><td className="text-right">{mad(l.unitPriceMad)}</td><td className="text-right">{mad(l.total)}</td><td className="text-right text-neutral-500">{l.priceDate ?? "estimation"}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-neutral-500">Le maximum inclut une marge de 15 % pour tests et imprévus. Les prix non datés sont des estimations à vérifier.</p>
      </Card>
    </div>
  ) : notAnalyzed;

  const delay = idea.tasks.length ? (
    <Card className="space-y-4">
      <div>
        <CardTitle>Temps de réalisation : tâches et dépendances</CardTitle>
        <CardHint>Durée calendaire ≠ somme des heures / nombre de personnes : les dépendances sont prises en compte.</CardHint>
      </div>
      <Gantt tasks={planned} deadlineDays={b.deadlineDays} />
    </Card>
  ) : notAnalyzed;

  const market = m ? (
    <div className="space-y-4">
      {!m.verified && (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/30">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Analyse non vérifiée : aucune recherche web n&apos;a été effectuée. Les éléments ci-dessous sont des hypothèses.</p>
        </Card>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-2">
          <CardTitle>Concurrents et alternatives</CardTitle>
          {competitors.length === 0 ? <CardHint>Aucun identifié.</CardHint> : (
            <ul className="space-y-1.5 text-sm">
              {competitors.map((c) => (
                <li key={c.name} className="flex items-center justify-between gap-2">
                  <span>
                    {c.url ? <a href={c.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline">{c.name}<ExternalLink className="size-3" /></a> : c.name}
                    {c.price && <span className="text-neutral-500"> · {c.price}</span>}
                  </span>
                  <Badge>{c.kind === "direct" ? "Direct" : "Alternative"}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="space-y-2"><CardTitle>Risques d&apos;adoption</CardTitle><List items={m.adoptionRisks} empty="Aucun risque relevé." /></Card>
        <Card className="space-y-2"><CardTitle>Questions de validation terrain</CardTitle><List items={m.fieldQuestions} empty="—" /></Card>
        <Card className="space-y-2">
          <CardTitle>Preuves et hypothèses</CardTitle>
          {idea.evidence.length === 0 ? <CardHint>Aucun élément enregistré.</CardHint> : (
            <ul className="space-y-2 text-sm">
              {idea.evidence.map((e) => (
                <li key={e.id} className="space-y-0.5">
                  <Badge tone={EVIDENCE_KIND[e.kind].tone}>{EVIDENCE_KIND[e.kind].label}</Badge> {e.statement}
                  {e.sourceUrl && (
                    <a href={e.sourceUrl} target="_blank" rel="noreferrer" className="block text-xs text-violet-600 hover:underline">
                      {e.sourceTitle ?? e.sourceUrl}{e.sourceDate && ` · ${e.sourceDate.toLocaleDateString("fr-FR")}`}
                    </a>
                  )}
                  {e.validation && <p className="text-xs text-neutral-500">À vérifier : {e.validation}</p>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  ) : notAnalyzed;

  const decision = s ? (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="space-y-3">
        <CardTitle>Détail du score</CardTitle>
        {(Object.keys(CRITERIA_LABEL) as (keyof typeof CRITERIA_LABEL)[]).map((k) => (
          <div key={k} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>{CRITERIA_LABEL[k]} <span className="text-neutral-400">· poids {totalW ? Math.round((weights[k] / totalW) * 100) : 0} %</span></span>
              <span className="tabular-nums">{s[k]}/100</span>
            </div>
            <div className="h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800"><div className="h-full rounded-full bg-violet-600" style={{ width: `${s[k]}%` }} /></div>
          </div>
        ))}
        <p className="border-t border-neutral-100 pt-2 text-xs text-neutral-500 dark:border-neutral-900">Score = Σ(note × poids) / Σ(poids) = <strong>{s.total}/100</strong>. Les notes ne sont pas des probabilités de réussite.</p>
      </Card>
      <Card className="space-y-2">
        <CardTitle>Argumentaire du Décideur</CardTitle>
        <p className="text-sm whitespace-pre-line">{s.rationale ?? "—"}</p>
      </Card>
    </div>
  ) : notAnalyzed;

  const mvpTab = (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="space-y-2"><CardTitle>Fonctionnalités essentielles</CardTitle><List items={mvp} empty="—" /></Card>
      <Card className="space-y-3">
        <div><CardTitle>Valeur de l&apos;IA</CardTitle><p className="text-sm">{idea.aiValue ?? "—"}</p></div>
        <div><CardTitle>Modèle économique</CardTitle><p className="text-sm">{idea.businessModel ?? "—"}</p></div>
      </Card>
      {idea.tasks.length > 0 && (
        <Card className="lg:col-span-2">
          <CardTitle className="mb-3">Backlog</CardTitle>
          <ol className="divide-y divide-neutral-100 text-sm dark:divide-neutral-900">
            {idea.tasks.map((task, i) => (
              <li key={task.id} className="flex justify-between gap-4 py-1.5">
                <span><span className="mr-2 font-mono text-xs text-neutral-400">{String(i + 1).padStart(2, "0")}</span>{task.title}{task.phase && <span className="text-neutral-500"> · {task.phase}</span>}</span>
                <span className="shrink-0 tabular-nums text-neutral-500">{range(task.hoursMin, task.hoursMax, "h")}</span>
              </li>
            ))}
          </ol>
        </Card>
      )}
    </div>
  );

  return (
    <>
      <PageHeader
        eyebrow="Fiche projet"
        title={idea.name}
        hint={idea.pitch}
        actions={<IdeaActions ideaId={idea.id} brainstormId={b.id} chosen={idea.status === "CHOSEN"} />}
      />
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge tone={st.tone}>{st.label}</Badge>
        <Link href={`/brainstorms/${b.id}`} className="text-neutral-500 hover:underline">← {b.title}</Link>
      </div>
      <Tabs
        tabs={[
          { id: "overview", label: "Vue globale", content: overview },
          { id: "feasibility", label: "Faisabilité", content: feasibility },
          { id: "cost", label: "Coût", content: cost },
          { id: "delay", label: "Délai", content: delay },
          { id: "market", label: "Marché", content: market },
          { id: "decision", label: "Décision IA", content: decision },
          { id: "mvp", label: "MVP", content: mvpTab },
        ]}
      />
    </>
  );
}

export default function IdeaPage(props: PageProps<"/ideas/[id]">) {
  return (
    <Suspense fallback={<Loading />}>
      <Content params={props.params} />
    </Suspense>
  );
}
