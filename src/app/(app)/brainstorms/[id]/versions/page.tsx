import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Loading, PageHeader } from "@/components/page-header";
import { Card, CardHint, CardTitle } from "@/components/ui/card";
import { pageUser } from "@/lib/auth/page";
import { db } from "@/lib/db";
import { CRITERIA_LABEL, range } from "@/lib/labels";
import { rankedIdeas, type Snapshot } from "@/lib/report";
import { cn } from "@/lib/utils";
import { DEFAULT_WEIGHTS } from "@/lib/validation";

function Delta({ a, b, invert }: { a?: number | null; b?: number | null; invert?: boolean }) {
  if (a == null || b == null || a === b) return null;
  const up = b > a;
  const good = invert ? !up : up;
  return <span className={cn("ml-1 text-xs", good ? "text-emerald-600" : "text-red-600")}>{up ? "+" : ""}{b - a}</span>;
}

async function Content({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await pageUser(`/brainstorms/${id}/versions`);
  const b = await db.brainstorm.findFirst({ where: { id, userId: user.id }, select: { id: true, title: true } });
  if (!b) notFound();
  const list = await db.brainstormVersion.findMany({ where: { brainstormId: id }, select: { version: true, createdAt: true }, orderBy: { version: "desc" } });
  if (list.length < 2) {
    return <Card><CardHint>Il faut au moins deux analyses terminées pour comparer des versions.</CardHint></Card>;
  }
  const vb = Number(sp.b) || list[0].version;
  const va = Number(sp.a) || list.find((v) => v.version < vb)?.version || list[1].version;
  const [A, B] = await Promise.all(
    [va, vb].map((version) => db.brainstormVersion.findUnique({ where: { brainstormId_version: { brainstormId: id, version } } })),
  );
  if (!A || !B) notFound();
  const sa = A.snapshot as unknown as Snapshot;
  const sb = B.snapshot as unknown as Snapshot;

  const ctx: [string, (s: Snapshot) => string][] = [
    ["Budget", (s) => (s.budgetMaxMad != null ? `${s.budgetMaxMad} DH` : "—")],
    ["Délai", (s) => (s.deadlineDays != null ? `${s.deadlineDays} j` : "—")],
    ["Équipe", (s) => (s.teamSize ? String(s.teamSize) : "—")],
    ["Secteur", (s) => s.sector ?? "Tous"],
    ["Public cible", (s) => s.targetAudience ?? "—"],
    ...(Object.keys(CRITERIA_LABEL) as (keyof typeof CRITERIA_LABEL)[]).map(
      (k) => [`Poids ${CRITERIA_LABEL[k].toLowerCase()}`, (s: Snapshot) => String((s.weights ?? DEFAULT_WEIGHTS)[k] ?? "—")] as [string, (s: Snapshot) => string],
    ),
  ];

  const ia = rankedIdeas(sa);
  const ib = rankedIdeas(sb);
  const names = [...new Set([...ib, ...ia].map((i) => i.name))];
  const byName = (arr: typeof ia, n: string) => arr.find((i) => i.name === n);

  const picker = (param: "a" | "b", current: number) => (
    <div className="flex flex-wrap gap-1">
      {list.map((v) => (
        <Link
          key={v.version}
          href={`?a=${param === "a" ? v.version : va}&b=${param === "b" ? v.version : vb}`}
          className={cn("rounded-md border px-2 py-0.5 text-xs", v.version === current ? "border-violet-600 bg-violet-600 text-white" : "border-neutral-300 dark:border-neutral-700")}
        >
          v{v.version}
        </Link>
      ))}
    </div>
  );

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="space-y-2"><CardTitle>Version A · {A.createdAt.toLocaleDateString("fr-FR")}</CardTitle>{picker("a", va)}</Card>
        <Card className="space-y-2"><CardTitle>Version B · {B.createdAt.toLocaleDateString("fr-FR")}</CardTitle>{picker("b", vb)}</Card>
      </div>

      <Card className="overflow-x-auto">
        <CardTitle className="mb-3">Contexte et critères</CardTitle>
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-neutral-500"><tr><th className="py-1"></th><th>v{va}</th><th>v{vb}</th></tr></thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-900">
            {ctx.map(([label, f]) => {
              const x = f(sa), y = f(sb);
              return (
                <tr key={label} className={cn(x !== y && "bg-amber-50 dark:bg-amber-950/30")}>
                  <td className="py-1.5 text-neutral-500">{label}</td><td>{x}</td><td className={cn(x !== y && "font-medium")}>{y}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <Card className="overflow-x-auto">
        <CardTitle className="mb-3">Classement</CardTitle>
        <table className="w-full text-sm whitespace-nowrap">
          <thead className="text-left text-xs text-neutral-500">
            <tr><th className="py-1">Idée</th><th className="text-right">Rang v{va}</th><th className="text-right">Rang v{vb}</th><th className="text-right">Score v{va}</th><th className="text-right">Score v{vb}</th><th className="text-right">Coût v{vb}</th></tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-900">
            {names.map((n) => {
              const x = byName(ia, n), y = byName(ib, n);
              return (
                <tr key={n}>
                  <td className="py-1.5 font-medium">{n}{!x && <span className="ml-1 text-xs text-violet-600">nouvelle</span>}{!y && <span className="ml-1 text-xs text-neutral-500">absente</span>}</td>
                  <td className="text-right">{x?.score?.rank ?? "—"}</td>
                  <td className="text-right">{y?.score?.rank ?? "—"}<Delta a={x?.score?.rank} b={y?.score?.rank} invert /></td>
                  <td className="text-right tabular-nums">{x?.score?.total ?? "—"}</td>
                  <td className="text-right tabular-nums">{y?.score?.total ?? "—"}<Delta a={x?.score?.total} b={y?.score?.total} /></td>
                  <td className="text-right">{y?.techEstimate ? range(y.techEstimate.costMinMad, y.techEstimate.costMaxMad, "DH") : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-neutral-500">Les idées sont rapprochées par leur nom : une relance depuis l&apos;Explorateur ou l&apos;Innovateur peut produire des idées différentes.</p>
      </Card>

      {(sa.extra?.decision || sb.extra?.decision) && (
        <div className="grid gap-4 md:grid-cols-2">
          {[[va, sa], [vb, sb]].map(([v, s]) => (
            <Card key={String(v)} className="space-y-1">
              <CardTitle>Décision v{String(v)}</CardTitle>
              <p className="text-sm">{(s as Snapshot).extra?.decision?.summary ?? "—"}</p>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

export default function VersionsPage(props: PageProps<"/brainstorms/[id]/versions">) {
  return (
    <>
      <PageHeader eyebrow="Versions" title="Comparer les versions" hint="Contexte, critères et classement d'une analyse à l'autre." />
      <Suspense fallback={<Loading />}>
        <Content params={props.params} searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
