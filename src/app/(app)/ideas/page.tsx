import Link from "next/link";
import { Suspense } from "react";
import { IdeaCard } from "@/components/idea-card";
import { Loading, PageHeader } from "@/components/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHint } from "@/components/ui/card";
import { pageUser } from "@/lib/auth/page";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";

const FILTERS = [
  ["all", "Toutes"],
  ["favorites", "Favoris"],
  ["chosen", "Choisies"],
  ["ok", "Dans les contraintes"],
] as const;

async function Content({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await pageUser("/ideas");
  const sp = await searchParams;
  const filter = sp.favorites ? "favorites" : String(sp.filter ?? "all");
  const ideas = await db.idea.findMany({
    where: {
      problem: { brainstorm: { userId: user.id, status: { not: "ARCHIVED" } } },
      ...(filter === "favorites" && { favorite: true }),
      ...(filter === "chosen" && { status: "CHOSEN" }),
      ...(filter === "ok" && { status: { in: ["WITHIN_CONSTRAINTS", "TO_VERIFY", "CHOSEN"] }, score: { blocked: false } }),
    },
    include: { score: true, techEstimate: true, marketAnalysis: true },
    orderBy: [{ favorite: "desc" }, { updatedAt: "desc" }],
    take: 120,
  });
  ideas.sort((a, b) => (b.score?.total ?? -1) - (a.score?.total ?? -1));

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(([k, label]) => (
          <Link
            key={k}
            href={k === "all" ? "/ideas" : `/ideas?filter=${k}`}
            className={cn("rounded-full border px-3 py-1 text-sm", filter === k ? "border-violet-600 bg-violet-600 text-white" : "border-neutral-300 dark:border-neutral-700")}
          >
            {label}
          </Link>
        ))}
      </div>
      {ideas.length === 0 ? (
        <Card className="space-y-3">
          <CardHint>Aucune idée dans cette catégorie.</CardHint>
          <ButtonLink href="/brainstorms/new" variant="outline">Nouveau brainstorming</ButtonLink>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ideas.map((i) => <IdeaCard key={i.id} idea={i} />)}
        </div>
      )}
    </>
  );
}

export default function IdeasPage(props: PageProps<"/ideas">) {
  return (
    <>
      <PageHeader eyebrow="Mes idées" title="Toutes vos idées" hint="Classées par score ; les favoris restent en tête de vos comparaisons." />
      <Suspense fallback={<Loading />}>
        <Content searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
