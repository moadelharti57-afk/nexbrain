import Link from "next/link";
import { Suspense } from "react";
import { CountUp } from "@/components/count-up";
import { Loading, PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHint, CardTitle } from "@/components/ui/card";
import { AGENT_LABEL, BRAINSTORM_STATUS } from "@/lib/labels";
import { pageUser } from "@/lib/auth/page";
import { db } from "@/lib/db";

async function Overview() {
  const user = await pageUser("/dashboard");
  const where = { userId: user.id };
  const [count, ideas, done, favorites, recent, runs] = await Promise.all([
    db.brainstorm.count({ where }),
    db.idea.count({ where: { problem: { brainstorm: where } } }),
    db.brainstorm.count({ where: { ...where, status: "COMPLETED" } }),
    db.idea.count({ where: { favorite: true, problem: { brainstorm: where } } }),
    db.brainstorm.findMany({ where: { ...where, status: { not: "ARCHIVED" } }, orderBy: { updatedAt: "desc" }, take: 5 }),
    db.run.findMany({
      where: { brainstorm: where },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { brainstorm: { select: { id: true, title: true } } },
    }),
  ]);

  const stats = [
    ["Brainstormings", count],
    ["Idées générées", ideas],
    ["Analyses terminées", done],
  ] as const;

  return (
    <>
      <PageHeader
        eyebrow="Vue générale"
        title={`Bonjour${user.name ? ` ${user.name}` : ""}, bienvenue sur NexBrain`}
        actions={<ButtonLink href="/brainstorms/new">Nouveau brainstorming</ButtonLink>}
      />

      <section className="grid gap-4 sm:grid-cols-3">
        {stats.map(([label, n]) => (
          <Card key={label}>
            <p className="text-3xl font-bold"><CountUp value={n} /></p>
            <CardHint>{label}</CardHint>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3">
          <CardTitle>Activité récente</CardTitle>
          {runs.length === 0 && <CardHint>Aucune analyse lancée pour l&apos;instant.</CardHint>}
          <ul className="space-y-2 text-sm">
            {runs.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2">
                <Link href={`/brainstorms/${r.brainstorm.id}`} className="truncate hover:underline">
                  Analyse « {r.brainstorm.title} »
                </Link>
                <span className="shrink-0 text-neutral-500">
                  {r.status === "SUCCEEDED" ? "terminée" : r.status === "FAILED" ? "échouée" : r.status === "CANCELLED" ? "annulée" : `en cours${r.currentAgent ? ` · ${AGENT_LABEL[r.currentAgent]}` : ""}`}
                </span>
              </li>
            ))}
            {favorites > 0 && (
              <li>
                <Link href="/ideas?favorites=1" className="hover:underline">{favorites} idée(s) en favoris</Link>
              </li>
            )}
          </ul>
        </Card>

        <Card className="space-y-3">
          <CardTitle>Brainstormings récents</CardTitle>
          {recent.length === 0 ? (
            <div className="space-y-3">
              <CardHint>Définissez un contexte (ville, budget, délai…) et laissez les 5 agents travailler.</CardHint>
              <ButtonLink href="/brainstorms/new" variant="outline">Définir le contexte →</ButtonLink>
            </div>
          ) : (
            <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {recent.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-2 py-2">
                  <Link href={`/brainstorms/${b.id}`} className="min-w-0">
                    <p className="truncate font-medium hover:underline">{b.title}</p>
                    <p className="text-xs text-neutral-500">
                      {[b.city, b.sector].filter(Boolean).join(" · ") || "Contexte libre"} · {b.updatedAt.toLocaleDateString("fr-FR")}
                    </p>
                  </Link>
                  <Badge tone={BRAINSTORM_STATUS[b.status].tone}>{BRAINSTORM_STATUS[b.status].label}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Overview />
    </Suspense>
  );
}
