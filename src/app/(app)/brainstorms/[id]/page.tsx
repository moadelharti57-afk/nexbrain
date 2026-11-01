import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BrainstormActions, ProblemToggle } from "@/components/brainstorm/actions";
import { RunProgress } from "@/components/brainstorm/run-progress";
import { IdeaCard } from "@/components/idea-card";
import { Loading, PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardHint, CardTitle } from "@/components/ui/card";
import type { DeciderOutput } from "@/lib/agents/schemas";
import { pageUser } from "@/lib/auth/page";
import { db } from "@/lib/db";
import { BRAINSTORM_STATUS, EVIDENCE_KIND } from "@/lib/labels";

async function Content({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await pageUser(`/brainstorms/${id}`);
  const b = await db.brainstorm.findFirst({
    where: { id, userId: user.id },
    include: {
      problems: {
        orderBy: [{ selected: "desc" }, { frequency: "desc" }],
        include: {
          evidence: true,
          ideas: { include: { score: true, techEstimate: true, marketAnalysis: true } },
        },
      },
      runs: { orderBy: { createdAt: "desc" }, take: 1 },
      _count: { select: { versions: true } },
    },
  });
  if (!b) notFound();

  const run = b.runs[0];
  const ideas = b.problems.flatMap((p) => p.ideas);
  const ranked = ideas
    .filter((i) => i.score && !i.score.blocked)
    .sort((a, z) => (a.score!.rank ?? 99) - (z.score!.rank ?? 99));
  const top = ranked.slice(0, 3);
  const others = ideas
    .filter((i) => !top.includes(i))
    .sort((a, z) => (a.score?.rank ?? 99) - (z.score?.rank ?? 99) || (z.score?.total ?? -1) - (a.score?.total ?? -1));
  const decision = (b.extra as { decision?: DeciderOutput } | null)?.decision;
  const st = BRAINSTORM_STATUS[b.status];

  const context = [
    [b.city, b.country].filter(Boolean).join(", "),
    b.sector,
    b.budgetMaxMad != null && `${b.budgetMaxMad.toLocaleString("fr-FR")} DH max`,
    b.deadlineDays != null && `${b.deadlineDays} jours`,
    b.teamSize && `${b.teamSize} pers.`,
  ].filter(Boolean);

  return (
    <>
      <PageHeader eyebrow="Résultats" title={b.title} hint={context.join(" · ") || "Contexte libre"} actions={<Badge tone={st.tone}>{st.label}</Badge>} />
      <BrainstormActions id={b.id} status={b.status} lastRunId={run?.id} lastRunFailed={run?.status === "FAILED"} hasVersions={b._count.versions > 0} />
      {b._count.versions > 1 && (
        <Link href={`/brainstorms/${b.id}/versions`} className="inline-block text-sm text-violet-600 hover:underline">
          Comparer les {b._count.versions} versions →
        </Link>
      )}

      {run && <RunProgress key={run.id + run.status} runId={run.id} initialStatus={run.status} />}
      {run?.status === "FAILED" && (
        <Card className="border-red-200 dark:border-red-900">
          <CardTitle className="text-red-700 dark:text-red-400">L&apos;analyse a échoué</CardTitle>
          <CardHint>{run.error} — « Reprendre » relance à partir de l&apos;agent en échec.</CardHint>
        </Card>
      )}

      {decision && (
        <Card className="space-y-2 border-violet-200 bg-violet-50/50 dark:border-violet-900 dark:bg-violet-950/30">
          <CardTitle>Décision argumentée</CardTitle>
          <p className="text-sm">{decision.summary}</p>
          {decision.insufficientEvidence && (
            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Aucune idée n&apos;est suffisamment documentée : validez le besoin sur le terrain avant d&apos;investir.</p>
          )}
        </Card>
      )}

      {top.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold">Top {top.length} — idées compatibles</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {top.map((i) => <IdeaCard key={i.id} idea={i} highlight />)}
          </div>
          <p className="text-xs text-neutral-500">Le classement dépend des critères et peut changer si le budget ou les poids sont modifiés. Un score n&apos;est pas une probabilité de réussite.</p>
        </section>
      )}

      {others.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold">Autres idées</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((i) => <IdeaCard key={i.id} idea={i} />)}
          </div>
        </section>
      )}

      {b.problems.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="font-semibold">Problèmes identifiés ({b.problems.length})</h2>
            <CardHint>Cochez les problèmes à approfondir, puis « Relancer depuis : Innovateur ».</CardHint>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {b.problems.map((p) => (
              <Card key={p.id} className="flex gap-3">
                <ProblemToggle problemId={p.id} selected={p.selected} disabled={b.status === "RUNNING"} />
                <div className="min-w-0 space-y-1.5">
                  <p className="font-medium">{p.title}</p>
                  <p className="text-sm text-neutral-500">{p.description}</p>
                  <p className="text-xs text-neutral-500">
                    {p.affectedUsers && <>Usagers : {p.affectedUsers} · </>}
                    {p.frequency && <>Fréquence supposée : {p.frequency}/5</>}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {p.evidence.map((e) => (
                      <Badge key={e.id} tone={EVIDENCE_KIND[e.kind].tone} title={e.validation ?? e.statement}>
                        {EVIDENCE_KIND[e.kind].label}
                      </Badge>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {b.status === "DRAFT" && b.problems.length === 0 && (
        <Card>
          <CardHint>Brouillon enregistré. Lancez les agents pour obtenir problèmes, idées et classement.</CardHint>
        </Card>
      )}
    </>
  );
}

export default function BrainstormPage(props: PageProps<"/brainstorms/[id]">) {
  return (
    <Suspense fallback={<Loading />}>
      <Content params={props.params} />
    </Suspense>
  );
}
