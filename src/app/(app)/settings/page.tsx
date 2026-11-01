import { Suspense } from "react";
import { Loading, PageHeader } from "@/components/page-header";
import { SettingsForm } from "@/components/settings-form";
import { Card, CardHint, CardTitle } from "@/components/ui/card";
import { pageUser } from "@/lib/auth/page";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { AGENT_LABEL } from "@/lib/labels";
import { userDefaultWeights } from "@/lib/preferences";

async function Content() {
  const user = await pageUser("/settings");
  const since = new Date();
  since.setDate(1);
  since.setHours(0, 0, 0, 0);
  const byAgent = await db.usageRecord.groupBy({
    by: ["agent"],
    where: { userId: user.id, createdAt: { gte: since } },
    _sum: { inputTokens: true, outputTokens: true },
  });
  const used = byAgent.reduce((s, a) => s + (a._sum.inputTokens ?? 0) + (a._sum.outputTokens ?? 0), 0);
  const quota = env().AI_MONTHLY_TOKEN_QUOTA;
  const pct = Math.min(100, Math.round((used / quota) * 100));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <SettingsForm name={user.name} email={user.email} weights={await userDefaultWeights(user.id)} />
      <Card className="space-y-3 lg:col-span-2">
        <CardTitle>Consommation IA ce mois-ci</CardTitle>
        <div className="h-2 rounded-full bg-neutral-100 dark:bg-neutral-800"><div className="h-full rounded-full bg-violet-600" style={{ width: `${pct}%` }} /></div>
        <CardHint>{used.toLocaleString("fr-FR")} / {quota.toLocaleString("fr-FR")} tokens ({pct} %)</CardHint>
        {byAgent.length > 0 && (
          <ul className="space-y-1 text-sm">
            {byAgent.map((a) => (
              <li key={a.agent ?? "other"} className="flex justify-between">
                <span>{a.agent ? AGENT_LABEL[a.agent] : "Autre"}</span>
                <span className="tabular-nums text-neutral-500">{((a._sum.inputTokens ?? 0) + (a._sum.outputTokens ?? 0)).toLocaleString("fr-FR")}</span>
              </li>
            ))}
          </ul>
        )}
        {env().AI_MOCK && <p className="text-xs text-amber-600">Mode démonstration actif (AI_MOCK) : aucun appel IA réel.</p>}
      </Card>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <>
      <PageHeader eyebrow="Paramètres" title="Paramètres" />
      <Suspense fallback={<Loading />}>
        <Content />
      </Suspense>
    </>
  );
}
