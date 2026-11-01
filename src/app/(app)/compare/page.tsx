import { Suspense } from "react";
import { Comparator, type CompareIdea } from "@/components/comparator";
import { Loading, PageHeader } from "@/components/page-header";
import { pageUser } from "@/lib/auth/page";
import { db } from "@/lib/db";

async function Content({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await pageUser("/compare");
  const sp = await searchParams;
  const ids = String(sp.ids ?? "").split(",").filter(Boolean);

  const rows = await db.idea.findMany({
    where: { problem: { brainstorm: { userId: user.id } }, score: { isNot: null }, techEstimate: { isNot: null } },
    include: { score: true, techEstimate: true, marketAnalysis: true, problem: { select: { brainstorm: { select: { title: true } } } } },
    orderBy: [{ favorite: "desc" }, { updatedAt: "desc" }],
    take: 100,
  });

  const ideas: CompareIdea[] = rows.map((i) => ({
    id: i.id,
    name: i.name,
    brainstorm: i.problem.brainstorm.title,
    criteria: { feasibility: i.score!.feasibility, cost: i.score!.cost, delay: i.score!.delay, demand: i.score!.demand, commercial: i.score!.commercial },
    blocked: i.score!.blocked,
    verified: i.marketAnalysis?.verified ?? false,
    cost: [i.techEstimate!.costMinMad, i.techEstimate!.costMaxMad],
    duration: [i.techEstimate!.durationMinDays, i.techEstimate!.durationMaxDays],
  }));

  // Présélection : idées demandées + meilleures idées jusqu'à 3
  const best = [...rows].filter((r) => !r.score!.blocked).sort((a, b) => b.score!.total - a.score!.total).map((r) => r.id);
  const initial = [...new Set([...ids.filter((id) => ideas.some((i) => i.id === id)), ...best])].slice(0, 3);

  return <Comparator ideas={ideas} initial={initial} />;
}

export default function ComparePage(props: PageProps<"/compare">) {
  return (
    <>
      <PageHeader eyebrow="Comparaison" title="Comparateur multicritère" hint="Ajustez les pondérations : le classement est recalculé instantanément." />
      <Suspense fallback={<Loading />}>
        <Content searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
