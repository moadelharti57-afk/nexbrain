import { NextResponse } from "next/server";
import { handler, requireUser } from "@/lib/api";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

/** Consommation IA du mois en cours et quota restant. */
export const GET = handler(async () => {
  const user = await requireUser();
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
  return NextResponse.json({ since, used, quota, remaining: Math.max(0, quota - used), byAgent });
});
