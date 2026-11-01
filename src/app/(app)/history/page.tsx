import Link from "next/link";
import { Suspense } from "react";
import { HistoryActions } from "@/components/history-actions";
import { Loading, PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardHint } from "@/components/ui/card";
import { pageUser } from "@/lib/auth/page";
import { db } from "@/lib/db";
import { BRAINSTORM_STATUS } from "@/lib/labels";

async function Content() {
  const user = await pageUser("/history");
  const rows = await db.brainstorm.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { versions: true, problems: true } } },
  });
  if (rows.length === 0) return <Card><CardHint>Votre historique est vide.</CardHint></Card>;
  return (
    <Card className="overflow-x-auto p-0">
      <table className="w-full text-sm">
        <thead className="border-b border-neutral-200 text-left text-xs text-neutral-500 uppercase dark:border-neutral-800">
          <tr><th className="px-4 py-3">Brainstorm</th><th>Date</th><th>Secteur</th><th>Versions</th><th>Statut</th><th className="px-4 text-right">Actions</th></tr>
        </thead>
        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-900">
          {rows.map((b) => (
            <tr key={b.id}>
              <td className="px-4 py-3"><Link href={`/brainstorms/${b.id}`} className="font-medium hover:underline">{b.title}</Link>{b.city && <span className="block text-xs text-neutral-500">{b.city}</span>}</td>
              <td className="whitespace-nowrap">{b.updatedAt.toLocaleDateString("fr-FR")}</td>
              <td>{b.sector ?? "—"}</td>
              <td className="tabular-nums">{b._count.versions}</td>
              <td><Badge tone={BRAINSTORM_STATUS[b.status].tone}>{BRAINSTORM_STATUS[b.status].label}</Badge></td>
              <td className="px-4 py-2"><HistoryActions id={b.id} status={b.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

export default function HistoryPage() {
  return (
    <>
      <PageHeader eyebrow="Persistance" title="Historique" hint="Chaque analyse est versionnée : contexte, résultats, critères et date restent consultables." />
      <Suspense fallback={<Loading />}>
        <Content />
      </Suspense>
    </>
  );
}
